import { Link } from 'react-router'
import { formatClock, useElapsed } from '../../hooks/useElapsed'
import { useStopTimer, useTimer } from '../../hooks/useWorkspaceData'
import { formatMinutes } from '../../lib/activity'
import styles from './time.module.css'

/** Home: today's tracked time and the running timer. */
export function TrackerCard({ className }: { className: string }) {
  const { data } = useTimer()
  const stop = useStopTimer()
  const entry = data?.data
  const elapsed = useElapsed(entry?.started_at)
  const today = (data?.today_minutes ?? 0) + (elapsed !== null ? Math.floor(elapsed / 60) : 0)

  return (
    <section className={className}>
      <h2>Registro de tiempo</h2>
      <p className={styles.cardToday}>
        <span className={styles.cardBig}>{formatMinutes(today)}</span> hoy
      </p>
      {entry && elapsed !== null ? (
        <div className={styles.cardRunning}>
          <span className={styles.cardClock}>{formatClock(elapsed)}</span>
          <Link to={`/tareas/${entry.task_id}`} className={styles.cardTask}>
            {entry.task?.title}
          </Link>
          <button type="button" className={styles.cardStop} onClick={() => stop.mutate()} disabled={stop.isPending}>
            <span className={styles.square} aria-hidden="true" /> Detener
          </button>
        </div>
      ) : (
        <p>Sin cronómetro activo. Pulsa ▶ en una tarea para empezar a medir.</p>
      )}
    </section>
  )
}
