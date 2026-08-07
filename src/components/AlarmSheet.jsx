import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store'
import { ALARM_SONGS, DEFAULT_SONG_ID } from '../data/songs'
import { unlockPreview, playPreview, stopPreview as stopPreviewAudio } from '../lib/previewAudio'
import Sheet from './Sheet'
import WheelPicker from './WheelPicker'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const REPS_OPTIONS = [10, 12, 15, 20]

function parseHour(hhmm) {
  const [H, M] = (hhmm || '07:00').split(':').map(Number)
  const ampm = H >= 12 ? 'PM' : 'AM'
  let h12 = H % 12
  if (h12 === 0) h12 = 12
  return { h12, min: M, ampm }
}

export default function AlarmSheet() {
  const { editingAlarm, alarms, addAlarm, updateAlarm, deleteAlarm, closeSheet, showToast, t } = useApp()
  const init = parseHour(editingAlarm?.hour)
  const dayLabels = t('days.initials').split(',')

  const [hour, setHour] = useState(String(init.h12))
  const [minute, setMinute] = useState(String(init.min).padStart(2, '0'))
  const [ampm, setAmpm] = useState(init.ampm)
  const [exercise, setExercise] = useState(editingAlarm?.exercise === 'lunges' ? 'lunges' : 'squats')
  const [reps, setReps] = useState(editingAlarm?.reps ?? 10)
  const [days, setDays] = useState(editingAlarm?.days ? [...editingAlarm.days] : [0, 1, 2, 3, 4])
  const [songId, setSongId] = useState(editingAlarm?.songId || DEFAULT_SONG_ID)

  // Desbloqueo progresivo (solo al CREAR): hora→ejercicio→días→canción. Al EDITAR
  // se muestra todo (ya está configurada).
  const [unlocked, setUnlocked] = useState(editingAlarm ? 4 : 1)
  const unlock = (n) => setUnlocked((u) => Math.max(u, n))

  // Previsualización: objeto Audio aparte (NO toca el <audio> de la alarma ni el
  // desbloqueo). Se detiene al cambiar de canción o al cerrar el editor.
  const [previewId, setPreviewId] = useState(null)
  const stopPreview = () => { stopPreviewAudio(); setPreviewId(null) }
  // Al desmontar el editor, corta el audio (sin setState en unmount).
  useEffect(() => () => stopPreviewAudio(), [])

  const togglePreview = (song) => {
    if (previewId === song.id) { stopPreview(); return }
    unlockPreview() // bendice el elemento DENTRO del gesto (iOS)
    playPreview(song.url, () => setPreviewId((cur) => (cur === song.id ? null : cur)))
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
    showToast(editingAlarm ? t('alarm.toast_updated') : t('alarm.toast_created'))
  }

  const remove = () => {
    stopPreview()
    deleteAlarm(editingAlarm.id)
    closeSheet()
    showToast(t('alarm.toast_deleted'))
  }

  return (
    <Sheet>
      <h3>{editingAlarm ? t('alarm.edit_title') : t('alarm.new_title')}</h3>
      <p className="lead">{t('alarm.lead')}</p>

      <div className="wheel-wrap">
        <div className="wheel-line" />
        <WheelPicker items={HOURS} initIdx={init.h12 - 1} onChange={(v) => { setHour(v); unlock(2) }} />
        <div className="wheel-colon">:</div>
        <WheelPicker items={MINUTES} initIdx={init.min} onChange={(v) => { setMinute(v); unlock(2) }} />
        <WheelPicker items={['AM', 'PM']} initIdx={init.ampm === 'PM' ? 1 : 0} isAP onChange={(v) => { setAmpm(v); unlock(2) }} />
      </div>

      {unlocked >= 2 && (
        <div className="cfg-stage">
          <div className="sec-h" style={{ margin: '6px 0 12px' }}><h2 style={{ fontSize: 18 }}>{t('alarm.exercise_h')}</h2></div>
          <div className="chip-row">
            <div className={'chip' + (exercise === 'squats' ? ' sel' : '')} onClick={() => { setExercise('squats'); unlock(3) }}>🍑<span>Squats</span></div>
            <div className={'chip' + (exercise === 'lunges' ? ' sel' : '')} onClick={() => { setExercise('lunges'); unlock(3) }}>🦵<span>Lunges</span></div>
          </div>

          <div className="sec-h" style={{ margin: '16px 0 12px' }}><h2 style={{ fontSize: 18 }}>{t('alarm.reps_h')}</h2></div>
          <div className="chip-row">
            {REPS_OPTIONS.map((r) => (
              <div key={r} className={'chip' + (reps === r ? ' sel' : '')} onClick={() => { setReps(r); unlock(3) }}>{r}<span>{t('alarm.reps_unit')}</span></div>
            ))}
          </div>
        </div>
      )}

      {unlocked >= 3 && (
        <div className="cfg-stage">
          <div className="sec-h" style={{ margin: '16px 0 12px' }}><h2 style={{ fontSize: 18 }}>{t('alarm.days_h')}</h2></div>
          <div className="daysel">
            {dayLabels.map((lbl, d) => (
              <div key={d} className={'d' + (days.includes(d) ? ' on' : '')} onClick={() => { toggleDay(d); unlock(4) }}>{lbl}</div>
            ))}
          </div>
        </div>
      )}

      {unlocked >= 4 && (
        <div className="cfg-stage">
          <div className="sec-h" style={{ margin: '16px 0 12px' }}><h2 style={{ fontSize: 18 }}>{t('alarm.sound_h')}</h2></div>
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
                  aria-label={previewId === song.id ? t('alarm.stop') : t('alarm.listen')}
                >
                  {previewId === song.id ? '◼' : '▶'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {unlocked < 4 && !editingAlarm && (
        <div className="cfg-hint">{unlocked === 1 ? t('alarm.hint1') : unlocked === 2 ? t('alarm.hint2') : t('alarm.hint3')}</div>
      )}

      <button
        className="cta full"
        style={{ marginTop: 20 }}
        onClick={() => { if (!editingAlarm && unlocked < 4) { setUnlocked((u) => u + 1); return } save() }}
      >
        {editingAlarm ? t('alarm.save_changes') : unlocked < 4 ? t('alarm.continue') : t('alarm.create')}
      </button>
      {canDelete && (
        <div className="alarm-delete" onClick={remove}>{t('alarm.delete')}</div>
      )}
    </Sheet>
  )
}
