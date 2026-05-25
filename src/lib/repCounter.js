// rep-counter.js — Contador de reps con anti-trampa, CALIBRABLE.
//
// Los umbrales viven en CONFIG (abajo) para afinarlos fácil. Mantiene la
// histéresis (dos umbrales) para no contar doble, pero está aflojado para que
// CUENTE reps reales de una persona frente a la cámara del teléfono sin exigir
// condiciones perfectas.
//
// Emite onState CADA frame con { phase, depth, reason, count } para feedback
// visual en vivo (mensaje grande, indicador ARRIBA/ABAJO y barra de profundidad).

// Índices BlazePose / MediaPipe Pose (33 puntos)
const LM = {
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
}

// ───────────────── UMBRALES CALIBRABLES (ajústalos aquí) ─────────────────
const CONFIG = {
  // Visibilidad mínima por articulación para contar (antes 0.6 = muy estricto).
  minVisibility: 0.35,
  // Histéresis del ángulo de rodilla (grados):
  downAngle: 115,   // por debajo => "abajo". Más alto = no exige bajar tanto (antes 95).
  upAngle: 152,     // por encima => "arriba". Más bajo = no exige extensión total (antes 160).
  // Suavizado EMA del ángulo (0..1; más alto = sigue más rápido).
  emaAlpha: 0.4,
  // Duración plausible de una rep (ms) — descarta sacudidas e imposibles.
  minRepMs: 450,    // antes 600
  maxRepMs: 9000,   // antes 8000
  // Tolerancia de inclinación del torso (grados). Más alto = más permisivo (antes 50).
  maxTorsoLeanDeg: 70,
  // Profundidad de cadera: si true, además exige que la cadera baje respecto a la
  // rodilla. Por defecto OFF: la profundidad la da el ángulo de rodilla (más fiable
  // en teléfono). Si lo activas, el margen controla cuánto debe bajar.
  requireHipDepth: false,
  squatHipDropMarginM: 0.25, // antes 0.08 (mucho más permisivo)
  // Lunge: holgura para considerar "ambas rodillas flexionadas" (antes 20).
  lungeBendToleranceDeg: 35,
  // Cuánto se mantiene visible un aviso de rechazo (ms).
  noticeMs: 1300,
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))

function angle3D(a, b, c) {
  // Ángulo en b del triángulo a-b-c usando coords 3D (x,y,z en metros).
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z
  const magAB = Math.hypot(ab.x, ab.y, ab.z)
  const magCB = Math.hypot(cb.x, cb.y, cb.z)
  if (magAB === 0 || magCB === 0) return 180
  return Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB)))) * (180 / Math.PI)
}

export class RepCounter {
  /**
   * @param {'squat'|'lunge'} exercise
   * @param {object} opts  sobre-escribe CONFIG + { onRep, onState }
   */
  constructor(exercise, opts = {}) {
    this.exercise = exercise
    this.o = { ...CONFIG, ...opts }
    this.reset()
  }

  reset() {
    this.count = 0
    this.phase = 'NOT_READY' // 'NOT_READY' | 'UP' | 'DOWN'
    this.ema = null
    this._emaPair = {}
    this.downStartTs = 0
    this.reachedDepth = false
    this.notice = null
    this.noticeUntil = 0
  }

  _visible(lm, ...idx) {
    return idx.every((i) => lm[i] && (lm[i].visibility ?? 1) >= this.o.minVisibility)
  }

  _smooth(angle) {
    this.ema = this.ema == null ? angle : this.o.emaAlpha * angle + (1 - this.o.emaAlpha) * this.ema
    return this.ema
  }

  _smoothPair(key, angle) {
    const prev = this._emaPair[key]
    const v = prev == null ? angle : this.o.emaAlpha * angle + (1 - this.o.emaAlpha) * prev
    this._emaPair[key] = v
    return v
  }

  // Inclinación del torso respecto a la vertical (grados). 0 = erguido.
  _torsoLean(w) {
    const sx = (w[LM.L_SHOULDER].x + w[LM.R_SHOULDER].x) / 2
    const sy = (w[LM.L_SHOULDER].y + w[LM.R_SHOULDER].y) / 2
    const hx = (w[LM.L_HIP].x + w[LM.R_HIP].x) / 2
    const hy = (w[LM.L_HIP].y + w[LM.R_HIP].y) / 2
    const dx = sx - hx
    const dy = sy - hy
    return Math.abs(Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI))
  }

  _setNotice(reason, ts) {
    this.notice = reason
    this.noticeUntil = ts + this.o.noticeMs
  }
  _activeNotice(ts) {
    return ts < this.noticeUntil ? this.notice : null
  }

  _emit(ts, depth) {
    this.o.onState?.(this.phase, { depth, count: this.count, reason: this._activeNotice(ts) })
  }

  // Valida la rep al volver arriba. Devuelve true si cuenta; si no, deja aviso.
  _tryComplete(ts) {
    const dur = ts - this.downStartTs
    if (dur < this.o.minRepMs) { this._setNotice('Más despacio', ts); return false }
    if (dur > this.o.maxRepMs) { this._setNotice('Repite el movimiento', ts); return false }
    if (!this.reachedDepth) { this._setNotice('Baja más', ts); return false }
    this.count++
    this.o.onRep?.(this.count)
    return true
  }

  /**
   * Procesa un frame. Llamar desde PoseTracker.onResult.
   */
  update({ landmarks, worldLandmarks, timestamp }) {
    const ts = timestamp
    const lm = landmarks
    const w = worldLandmarks || landmarks // si no hay world, degradar a normalizado

    // Gating: piernas completas (cadera + rodillas + tobillos). Los hombros son
    // opcionales (solo afinan el torso) para no cortar por encuadre.
    const ready = this._visible(
      lm, LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE,
    )
    if (!ready) {
      this.phase = 'NOT_READY'
      this.o.onState?.('NOT_READY', { depth: 0, count: this.count, reason: 'Ponte de cuerpo completo en cuadro' })
      return
    }

    if (this.exercise === 'squat') this._squat(w, ts)
    else this._lunge(w, ts)
  }

  _squat(w, ts) {
    const lAngle = angle3D(w[LM.L_HIP], w[LM.L_KNEE], w[LM.L_ANKLE])
    const rAngle = angle3D(w[LM.R_HIP], w[LM.R_KNEE], w[LM.R_ANKLE])
    const knee = this._smooth((lAngle + rAngle) / 2)

    const torsoOk = this._torsoLean(w) <= this.o.maxTorsoLeanDeg
    const hipY = (w[LM.L_HIP].y + w[LM.R_HIP].y) / 2
    const kneeY = (w[LM.L_KNEE].y + w[LM.R_KNEE].y) / 2
    const hipDeep = hipY >= kneeY - this.o.squatHipDropMarginM // +Y = abajo
    const depthOk = torsoOk && (!this.o.requireHipDepth || hipDeep)

    const depth = clamp01((this.o.upAngle - knee) / (this.o.upAngle - this.o.downAngle))

    if (this.phase !== 'DOWN' && knee < this.o.downAngle) {
      this.phase = 'DOWN'
      this.downStartTs = ts
      this.reachedDepth = false
    } else if (this.phase === 'DOWN') {
      if (depthOk) this.reachedDepth = true
      if (knee > this.o.upAngle) {
        this._tryComplete(ts)
        this.phase = 'UP'
      }
    } else {
      this.phase = 'UP'
    }

    this._emit(ts, depth)
  }

  _lunge(w, ts) {
    const lAngle = this._smoothPair('l', angle3D(w[LM.L_HIP], w[LM.L_KNEE], w[LM.L_ANKLE]))
    const rAngle = this._smoothPair('r', angle3D(w[LM.R_HIP], w[LM.R_KNEE], w[LM.R_ANKLE]))

    const torsoOk = this._torsoLean(w) <= this.o.maxTorsoLeanDeg
    const frontDeep = Math.min(lAngle, rAngle) < this.o.downAngle
    const bothBent =
      lAngle < this.o.downAngle + this.o.lungeBendToleranceDeg &&
      rAngle < this.o.downAngle + this.o.lungeBendToleranceDeg
    const bothExtended = lAngle > this.o.upAngle && rAngle > this.o.upAngle

    const depth = clamp01((this.o.upAngle - Math.min(lAngle, rAngle)) / (this.o.upAngle - this.o.downAngle))

    if (this.phase !== 'DOWN' && frontDeep && bothBent) {
      this.phase = 'DOWN'
      this.downStartTs = ts
      this.reachedDepth = false
    } else if (this.phase === 'DOWN') {
      if (torsoOk) this.reachedDepth = true
      if (bothExtended) {
        this._tryComplete(ts)
        this.phase = 'UP'
      }
    } else {
      this.phase = 'UP'
    }

    this._emit(ts, depth)
  }
}
