import { Link } from 'react-router'
import type { TimeEntry } from '../../api/types'
import { formatClock, useElapsed } from '../../hooks/useElapsed'
import { useStopTimer, useTimer } from '../../hooks/useWorkspaceData'
import styles from './time.module.css'
import { t } from '../../lib/i18n'

/** Top bar: every running timer, visible on every page, each with its stop button. */
export function TimerPill() {
  const { data } = useTimer()
  const entries = data?.data ?? []
  if (entries.length === 0) return null

  return (
    <div className={`${styles.pills} ${entries.length > 1 ? styles.pillsMany : ''}`}>
      {entries.map((e) => (
        <Pill key={e.id} entry={e} />
      ))}
    </div>
  )
}

function Pill({ entry }: { entry: TimeEntry }) {
  const stop = useStopTimer()
  const elapsed = useElapsed(entry.started_at)
  if (elapsed === null) return null

  return (
    <div className={styles.pill} role="status" aria-label={t('Cronómetro en marcha: {title}', { title: entry.task?.title ?? '' })}>
      <span className={styles.pulse} aria-hidden="true" />
      <Link to={`/tareas/${entry.task_id}`} className={styles.pillTask}>
        {entry.task?.title}
      </Link>
      <span className={styles.pillClock}>{formatClock(elapsed)}</span>
      <button
        type="button"
        className={styles.stopSmall}
        aria-label={t('Detener cronómetro de "{title}"', { title: entry.task?.title ?? '' })}
        title={t('Detener')}
        onClick={() => stop.mutate(entry.task_id)}
        disabled={stop.isPending}
      >
        <span className={styles.square} aria-hidden="true" />
      </button>
    </div>
  )
}
