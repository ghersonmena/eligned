import { useState, type FormEvent } from 'react'
import type { Task } from '../../api/types'
import { formatClock, useElapsed } from '../../hooks/useElapsed'
import { useAddTimeEntry, useDeleteTimeEntry, useTimeEntries, useTimer } from '../../hooks/useWorkspaceData'
import { formatMinutes } from '../../lib/activity'
import { Icon } from '../Icon'
import { TimerButton } from './TimerButton'
import styles from './time.module.css'

const when = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function todayInput() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Task detail: timer, total, entries and "add time by hand". */
export function TimeSection({ task }: { task: Task }) {
  const { data } = useTimeEntries(task.id)
  const { data: timer } = useTimer()
  const running = timer?.data.find((e) => e.task_id === task.id) ?? null
  const elapsed = useElapsed(running?.started_at)
  const add = useAddTimeEntry(task.id)
  const remove = useDeleteTimeEntry()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayInput)
  const [hours, setHours] = useState('')
  const [mins, setMins] = useState('')
  const [note, setNote] = useState('')

  const entries = (data?.data ?? []).filter((e) => !e.running)
  const total = data?.total_minutes ?? task.tracked_minutes ?? 0
  const minutes = (Number(hours) || 0) * 60 + (Number(mins) || 0)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (minutes < 1) return
    // Logged as ending now when it is today, or at 18:00 of a past day.
    const [y, m, d] = date.split('-').map(Number)
    const isToday = date === todayInput()
    const end = isToday ? new Date() : new Date(y, m - 1, d, 18, 0)
    const start = new Date(end.getTime() - minutes * 60_000)
    add.mutate(
      { started_at: start.toISOString(), minutes, note: note.trim() || null },
      {
        onSuccess: () => {
          setHours('')
          setMins('')
          setNote('')
          setOpen(false)
        },
      },
    )
  }

  return (
    <section className={styles.section} aria-labelledby="time-title">
      <div className={styles.sectionHead}>
        <h2 id="time-title">Tiempo</h2>
        <span className={styles.total}>
          {formatMinutes(total)} registrados
          {elapsed !== null && <span className={styles.live}> + {formatClock(elapsed)} en curso</span>}
        </span>
      </div>
      <div className={styles.actions}>
        <TimerButton task={task} large />
        <button type="button" className={styles.manualToggle} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="plus" size={16} /> Agregar tiempo a mano
        </button>
      </div>

      {open && (
        <form className={styles.manual} onSubmit={submit}>
          <label>
            Día
            <input type="date" value={date} max={todayInput()} required onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Horas
            <input type="number" inputMode="numeric" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <label>
            Minutos
            <input type="number" inputMode="numeric" min={0} max={59} value={mins} onChange={(e) => setMins(e.target.value)} />
          </label>
          <label className={styles.noteField}>
            Nota (opcional)
            <input type="text" className="caps" autoCapitalize="characters" maxLength={255} value={note} placeholder="¿Qué hiciste?" onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" className={styles.save} disabled={minutes < 1 || minutes > 1440 || add.isPending}>
            {add.isPending ? 'Guardando…' : 'Guardar'}
          </button>
          {add.isError && (
            <p className={styles.error} role="alert">
              No se pudo guardar. Revisa el día y la duración.
            </p>
          )}
        </form>
      )}

      {entries.length > 0 && (
        <ul className={styles.entries}>
          {entries.map((e) => (
            <li key={e.id}>
              <span className={styles.entryTime}>{formatMinutes(e.minutes)}</span>
              <span className={styles.entryMeta}>
                {when.format(new Date(e.started_at))}
                {e.user && ` · ${e.user.name}`}
                {e.note && <span className={styles.entryNote}>{e.note}</span>}
              </span>
              {e.can_delete && (
                <button
                  type="button"
                  className={styles.entryDelete}
                  aria-label={`Eliminar registro de ${formatMinutes(e.minutes)}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`¿Eliminar este registro de ${formatMinutes(e.minutes)}?`)) remove.mutate(e.id)
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
