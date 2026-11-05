import { useState, type FormEvent } from 'react'
import type { Task } from '../../api/types'
import { useAddReminder, useDeleteReminder, useReminders } from '../../hooks/useWorkspaceData'
import { Icon } from '../Icon'
import styles from './reminders.module.css'

const when = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const OFFSETS: { value: number; label: string }[] = [
  { value: 0, label: 'A la hora límite' },
  { value: 15, label: '15 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 180, label: '3 horas antes' },
  { value: 1440, label: '1 día antes' },
]

function offsetLabel(minutes: number): string {
  return OFFSETS.find((o) => o.value === minutes)?.label ?? `${minutes} min antes`
}

/** Value for <input type="datetime-local"> one hour from now. */
function inAnHour(): string {
  const d = new Date(Date.now() + 60 * 60_000)
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Task detail: the signed-in person's reminders for this task. */
export function RemindersSection({ task }: { task: Task }) {
  const { data: reminders = [] } = useReminders(task.id)
  const add = useAddReminder(task.id)
  const remove = useDeleteReminder(task.id)
  const [choice, setChoice] = useState(task.due_at ? '60' : 'custom')
  const [at, setAt] = useState(inAnHour)

  if (task.completed && reminders.length === 0) return null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (choice === 'custom') add.mutate({ remind_at: new Date(at).toISOString() })
    else add.mutate({ offset_minutes: Number(choice) })
  }

  return (
    <section className={styles.section} aria-labelledby="reminders-title">
      <h2 id="reminders-title">Recordatorios</h2>
      {reminders.length > 0 && (
        <ul className={styles.list}>
          {reminders.map((r) => (
            <li key={r.id} className={r.sent ? styles.sent : undefined}>
              <Icon name="bell" size={16} />
              <span className={styles.text}>
                {when.format(new Date(r.remind_at))}
                {r.offset_minutes !== null && <small> · {offsetLabel(r.offset_minutes).toLowerCase()} del vencimiento</small>}
                {r.sent && <small> · enviado</small>}
              </span>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Quitar recordatorio del ${when.format(new Date(r.remind_at))}`}
                onClick={() => remove.mutate(r.id)}
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span className="visually-hidden">Cuándo avisar</span>
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            {task.due_at && OFFSETS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            <option value="custom">En una fecha y hora…</option>
          </select>
        </label>
        {choice === 'custom' && (
          <label className={styles.field}>
            <span className="visually-hidden">Fecha y hora del recordatorio</span>
            <input type="datetime-local" value={at} min={inAnHour().slice(0, 10) + 'T00:00'} required onChange={(e) => setAt(e.target.value)} />
          </label>
        )}
        <button type="submit" className={styles.add} disabled={add.isPending}>
          <Icon name="plus" size={16} /> Agregar
        </button>
      </form>
      {add.isError && (
        <p className={styles.error} role="alert">
          No se pudo agregar: elige un momento en el futuro.
        </p>
      )}
      <p className={styles.hint}>
        Te avisamos en la campana{task.due_at ? '; los que van "antes del vencimiento" se mueven si cambia la fecha límite' : ''}.
      </p>
    </section>
  )
}
