/* Ruleta de Brenda Coins. El SERVIDOR ya decidió el premio (context.roulette
   .prize); aquí SOLO animamos la rueda hasta el segmento correcto y revelamos.
   La rueda tiene varios 0 (con frase motivacional), varios 5, algunos 10 y un
   100 raro — coherente con los pesos del servidor. */
import { useState, useMemo } from 'react'
import { useApp } from '../store'

// Disposición fija de la rueda (8 segmentos). Todos los premios posibles del
// servidor (0,5,10,100) tienen al menos un segmento.
const SEGMENTS = [5, 0, 10, 0, 100, 0, 5, 10]
const SEG = 360 / SEGMENTS.length // 45°

const segColor = (v) => (v === 100 ? 'var(--gold, #f5c542)' : v === 10 ? 'var(--lime, #d8ff3e)' : v === 5 ? 'var(--magenta, #ff1f6b)' : 'rgba(255,255,255,.10)')
const ZERO_KEYS = ['bc.roulette.zero1', 'bc.roulette.zero2', 'bc.roulette.zero3', 'bc.roulette.zero4']

export default function RouletteModal() {
  const { roulette, closeRoulette, t } = useApp()
  const [phase, setPhase] = useState('ready') // ready | spinning | done
  const [rot, setRot] = useState(0)

  const prize = roulette?.prize ?? 0
  const source = roulette?.source

  // Fondo de la rueda (conic-gradient) — memo para no recalcular por render.
  const wheelBg = useMemo(
    () => `conic-gradient(${SEGMENTS.map((v, i) => `${segColor(v)} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(', ')})`,
    [],
  )
  const zeroMsg = useMemo(() => t(ZERO_KEYS[Math.floor(Math.random() * ZERO_KEYS.length)]), [t])

  const doSpin = () => {
    if (phase !== 'ready') return
    // Elige un segmento cuyo valor == premio (aleatorio entre los que empatan).
    const matches = SEGMENTS.map((v, i) => (v === prize ? i : -1)).filter((i) => i >= 0)
    const idx = matches[Math.floor(Math.random() * matches.length)] ?? 0
    // Trae el CENTRO del segmento bajo el puntero superior + varias vueltas.
    const target = 360 * 6 - (idx * SEG + SEG / 2)
    setPhase('spinning')
    setRot(target)
    setTimeout(() => setPhase('done'), 3400) // coincide con la transición CSS
  }

  if (!roulette) return null

  return (
    <div className="rlt-backdrop" role="dialog" aria-modal="true">
      <div className="rlt-card reveal">
        <div className="rlt-kick">{source === 'challenge' ? t('bc.roulette.sub_challenge') : t('bc.roulette.sub_alarm')}</div>
        <h2 className="rlt-title">{t('bc.roulette.title')}</h2>

        <div className="rlt-wheel-wrap">
          <div className="rlt-pointer">▾</div>
          <div
            className="rlt-wheel"
            style={{ background: wheelBg, transform: `rotate(${rot}deg)` }}
          >
            {SEGMENTS.map((v, i) => (
              <div key={i} className="rlt-label" style={{ transform: `rotate(${i * SEG + SEG / 2}deg) translateY(-104px)` }}>
                <span style={{ transform: `rotate(${-(i * SEG + SEG / 2)}deg)` }}>{v === 100 ? '💎100' : v}</span>
              </div>
            ))}
            <div className="rlt-hub">🍑</div>
          </div>
        </div>

        {phase !== 'done' ? (
          <button className="rlt-spin" onClick={doSpin} disabled={phase === 'spinning'}>
            {phase === 'spinning' ? t('bc.roulette.spinning') : t('bc.roulette.spin_btn')}
          </button>
        ) : (
          <div className="rlt-result reveal">
            {prize > 0 ? (
              <>
                <div className="rlt-won-n">+{prize}</div>
                <div className="rlt-won-l">{t('bc.roulette.won', { n: prize })}</div>
              </>
            ) : (
              <>
                <div className="rlt-zero-t">{t('bc.roulette.zero_title')}</div>
                <div className="rlt-zero-m">{zeroMsg}</div>
              </>
            )}
            <button className="rlt-close" onClick={closeRoulette}>{t('bc.roulette.close')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
