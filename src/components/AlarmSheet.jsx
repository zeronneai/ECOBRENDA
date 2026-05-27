import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store'
import { DAY_LABELS } from '../data/onboarding'
import { ALARM_SONGS, DEFAULT_SONG_ID } from '../data/songs'
import Sheet from './Sheet'
import WheelPicker from './WheelPicker'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const REPS_OPTIONS = [5, 8, 10, 12, 15, 20]

function parseHour(hhmm) {
  const [H, M] = (hhmm || '07:00').split(':').map(Number)
  const ampm = H >= 12 ? 'PM' : 'AM'
  let h12 = H % 12
  if (h12 === 0) h12 = 12
  return { h12, min: M, ampm }
}

export default function AlarmSheet() {
  const { editingAlarm, alarms, addAlarm, updateAlarm, deleteAlarm, closeSheet, showToast } = useApp()
  const init = parseHour(editingAlarm?.hour)

  const [hour, setHour] = useState(String(init.h12))
  const [minute, setMinute] = useState(String(init.min).padStart(2, '0'))
  const [ampm, setAmpm] = useState(init.ampm)
  const [exercise, setExercise] = useState(editingAlarm?.exercise === 'lunges' ? 'lunges' : 'squats')
  const [reps, setReps] = useState(editingAlarm?.reps ?? 10)
  const [days, setDays] = useState(editingAlarm?.days ? [...editingAlarm.days] : [0, 1, 2, 3, 4])
  const [songId, setSongId] = useState(editingAlarm?.songId || DEFAULT_SONG_ID)

  // Previsualización: objeto Audio aparte (NO toca el <audio> de la alarma ni el
  // desbloqueo). Se detiene al cambiar de canción o al cerrar el editor.
  const [previewId, setPreviewId] = useState(null)
  const previewRef = useRef(null)
  const stopPreview = () => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current = null }
    setPreviewId(null)
  }
  useEffect(() => stopPreview, [])

  const togglePreview = (song) => {
    if (previewId === song.id) { stopPreview(); return }
    stopPreview()
    const a = new Audio(song.url)
    a.volume = 1.0
    a.play().catch(() => {})
    a.onended = () => setPreviewId((cur) => (cur === song.id ? null : cur))
    previewRef.current = a
    setPreviewId(song.id)
  }

  const pickSong = (id) => { setSongId(id); stopPreview() }

  // Solo se puede borrar una alarma extra (la primera "Despertar Activo" siempre queda).
  const canDelete = editingAlarm && alarms.length > 1 && alarms[0]?.id !== editingAlarm.id

  const computeHour = () => {
    let H = parseInt(hour, 10)
    if (ampm === 'PM' && H !== 12) H += 12
    if (ampm === 'AM' && H === 12) H = 0
    return String(H).padStart(2, '0') + ':' + minute
  }

  const toggleDay = (d) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)))
  }

  const save = () => {
    stopPreview()
    const payload = { hour: computeHour(), exercise, reps, days, songId }
    if (editingAlarm) updateAlarm(editingAlarm.id, payload)
    else addAlarm({ ...payload, active: true })
    closeSheet()
    showToast(editingAlarm ? 'Alarma actualizada ✓' : 'Alarma creada ✓')
  }

  const remove = () => {
    stopPreview()
    deleteAlarm(editingAlarm.id)
    closeSheet()
    showToast('Alarma eliminada')
  }

  return (
    <Sheet>
      <h3>{editingAlarm ? 'EDITAR ALARMA' : 'NUEVA ALARMA'}</h3>
      <p className="lead">Define la hora y el reto que tendrás que completar para apagarla.</p>

      <div className="wheel-wrap">
        <div className="wheel-line" />
        <WheelPicker items={HOURS} initIdx={init.h12 - 1} onChange={(v) => setHour(v)} />
        <div className="wheel-colon">:</div>
        <WheelPicker items={MINUTES} initIdx={init.min} onChange={(v) => setMinute(v)} />
        <WheelPicker items={['AM', 'PM']} initIdx={init.ampm === 'PM' ? 1 : 0} isAP onChange={(v) => setAmpm(v)} />
      </div>

      <div className="sec-h" style={{ margin: '6px 0 12px' }}><h2 style={{ fontSize: 18 }}>EJERCICIO</h2></div>
      <div className="chip-row">
        <div className={'chip' + (exercise === 'squats' ? ' sel' : '')} onClick={() => setExercise('squats')}>🍑<span>Squats</span></div>
        <div className={'chip' + (exercise === 'lunges' ? ' sel' : '')} onClick={() => setExercise('lunges')}>🦵<span>Lunges</span></div>
      </div>

      <div className="sec-h" style={{ margin: '16px 0 12px' }}><h2 style={{ fontSize: 18 }}>REPETICIONES</h2></div>
      <div className="chip-row">
        {REPS_OPTIONS.map((r) => (
          <div key={r} className={'chip' + (reps === r ? ' sel' : '')} onClick={() => setReps(r)}>{r}<span>reps</span></div>
        ))}
      </div>

      <div className="sec-h" style={{ margin: '16px 0 12px' }}><h2 style={{ fontSize: 18 }}>DÍAS</h2></div>
      <div className="daysel">
        {DAY_LABELS.map((lbl, d) => (
          <div key={d} className={'d' + (days.includes(d) ? ' on' : '')} onClick={() => toggleDay(d)}>{lbl}</div>
        ))}
      </div>

      <div className="sec-h" style={{ margin: '16px 0 12px' }}><h2 style={{ fontSize: 18 }}>SONIDO DE ALARMA</h2></div>
      <div className="songsel">
        {ALARM_SONGS.map((song) => (
          <div
            key={song.id}
            className={'songrow' + (songId === song.id ? ' sel' : '')}
            onClick={() => pickSong(song.id)}
          >
            <span className="songradio" />
            <span className="songname">{song.nombre}</span>
            <button
              type="button"
              className={'songplay' + (previewId === song.id ? ' on' : '')}
              onClick={(e) => { e.stopPropagation(); togglePreview(song) }}
              aria-label={previewId === song.id ? 'Detener' : 'Escuchar'}
            >
              {previewId === song.id ? '◼' : '▶'}
            </button>
          </div>
        ))}
      </div>

      <button className="cta full" style={{ marginTop: 20 }} onClick={save}>
        {editingAlarm ? 'GUARDAR CAMBIOS' : 'CREAR ALARMA'}
      </button>
      {canDelete && (
        <div className="alarm-delete" onClick={remove}>Eliminar alarma</div>
      )}
    </Sheet>
  )
}
