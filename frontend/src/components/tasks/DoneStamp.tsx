import type { Task } from '../../api/types'
import { finishedLate, formatDone } from '../../lib/dates'
import styles from './DoneStamp.module.css'

const full = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** "✓ Terminada hoy 14:32 · con retraso": when a completed task was finished. */
export function DoneStamp({ task, long = false }: { task: Pick<Task, 'completed' | 'completed_at' | 'due_at'>; long?: boolean }) {
  if (!task.completed || !task.completed_at) return null
  const late = finishedLate(task)
  const when = long ? `el ${full.format(new Date(task.completed_at))}` : formatDone(task.completed_at)
  return (
    <span className={styles.stamp} title={`Terminada el ${full.format(new Date(task.completed_at))}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
      Terminada {when}
      {task.due_at && <span className={late ? styles.late : styles.onTime}>{late ? ' · con retraso' : ' · a tiempo'}</span>}
    </span>
  )
}
