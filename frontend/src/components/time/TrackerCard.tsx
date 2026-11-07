import { Link } from 'react-router'
import type { TimeEntry } from '../../api/types'
import { formatClock, useElapsed } from '../../hooks/useElapsed'
import { useStopTimer, useTimer } from '../../hooks/useWorkspaceData'
import { formatMinutes } from '../../lib/activity'
import styles from './time.module.css'

/** Home: today's tracked time and every running timer. */
export function TrackerCard({ className }: { className: string }) {
  const { data } = useTimer()
  const entries = data?.data ?? []
  // Ticks every second while something runs; gives "now" for the sum below.
  const first = useElapsed(entries[0]?.started_at)
  const nowMs = first === null ? 0 : new Date(entries[0].started_at).getTime() + first * 1000
  const runningMinutes = entries.reduce((sum, e) => sum + Math.max(0, Math.floor((nowMs - new Date(e.started_at).getTime()) / 60_000)), 0)
  const today = (data?.today_minutes ?? 0) + runningMinutes

  return (
    <section className={className}>
      <h2>Registro de tiempo</h2>
      <p className={styles.cardToday}>
        <span className={styles.cardBig}>{formatMinutes(today)}</span> hoy
      </p>
      {entries.length > 0 ? (
        entries.map((e) => <Running key={e.id} entry={e} />)
      ) : (
        <p>Sin cronómetro activo. Pulsa ▶ en una tarea para empezar a medir; puedes tener varios en marcha.</p>
      )}
    </section>
  )
}

function Running({ entry }: { entry: TimeEntry }) {
  const stop = useStopTimer()
  const elapsed = useElapsed(entry.started_at)
  if (elapsed === null) return null
  return (
    <div className={styles.cardRunning}>
      <span className={styles.cardClock}>{formatClock(elapsed)}</span>
      <Link to={`/tareas/${entry.task_id}`} className={styles.cardTask}>
        {entry.task?.title}
      </Link>
      <button type="button" className={styles.cardStop} onClick={() => stop.mutate(entry.task_id)} disabled={stop.isPending}>
        <span className={styles.square} aria-hidden="true" /> Detener
      </button>
    </div>
  )
}
