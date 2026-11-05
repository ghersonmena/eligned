import type { Task } from '../../api/types'
import { useStartTimer, useStopTimer, useTimer } from '../../hooks/useWorkspaceData'
import styles from './time.module.css'

/** ▶ / ■ for one task. Other tasks' timers keep running. */
export function TimerButton({ task, large = false }: { task: Task; large?: boolean }) {
  const { data } = useTimer()
  const start = useStartTimer()
  const stop = useStopTimer()
  const running = !!data?.data.some((e) => e.task_id === task.id)
  if (task.completed && !running) return null
  const busy = start.isPending || stop.isPending

  if (large) {
    return (
      <button
        type="button"
        className={running ? styles.bigStop : styles.bigStart}
        disabled={busy}
        onClick={() => (running ? stop.mutate(task.id) : start.mutate(task.id))}
      >
        {running ? <span className={styles.square} aria-hidden="true" /> : <span className={styles.play} aria-hidden="true" />}
        {running ? 'Detener cronómetro' : 'Iniciar cronómetro'}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`${styles.small} ${running ? styles.smallRunning : ''}`}
      aria-label={running ? `Detener cronómetro de "${task.title}"` : `Iniciar cronómetro en "${task.title}"`}
      title={running ? 'Detener cronómetro' : 'Iniciar cronómetro'}
      disabled={busy}
      onClick={() => (running ? stop.mutate(task.id) : start.mutate(task.id))}
    >
      {running ? <span className={styles.square} aria-hidden="true" /> : <span className={styles.play} aria-hidden="true" />}
    </button>
  )
}
