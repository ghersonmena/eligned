import { Link } from 'react-router'
import { formatClock, useElapsed } from '../../hooks/useElapsed'
import { useStopTimer, useTimer } from '../../hooks/useWorkspaceData'
import styles from './time.module.css'

/** Top bar: the running timer, visible on every page, with a stop button. */
export function TimerPill() {
  const { data } = useTimer()
  const stop = useStopTimer()
  const entry = data?.data
  const elapsed = useElapsed(entry?.started_at)
  if (!entry || elapsed === null) return null

  return (
    <div className={styles.pill} role="status" aria-label={`Cronómetro en marcha: ${entry.task?.title ?? ''}`}>
      <span className={styles.pulse} aria-hidden="true" />
      <Link to={`/tareas/${entry.task_id}`} className={styles.pillTask}>
        {entry.task?.title}
      </Link>
      <span className={styles.pillClock}>{formatClock(elapsed)}</span>
      <button type="button" className={styles.stopSmall} aria-label="Detener cronómetro" title="Detener" onClick={() => stop.mutate()} disabled={stop.isPending}>
        <span className={styles.square} aria-hidden="true" />
      </button>
    </div>
  )
}
