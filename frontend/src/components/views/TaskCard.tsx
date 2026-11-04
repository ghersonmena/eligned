import { Link } from 'react-router'
import type { Task } from '../../api/types'
import { chipStyle, priorityInfo } from '../../lib/colors'
import { dueGroup, formatDue } from '../../lib/dates'
import { initials } from '../../lib/initials'
import { Icon } from '../Icon'
import styles from './views.module.css'

interface TaskCardProps {
  task: Task
  /** "Mover a …" button (keyboard/touch friendly alternative to dragging). */
  next?: { name: string; onMove: () => void }
  dragging?: boolean
}

/** Kanban card. */
export function TaskCard({ task, next, dragging }: TaskCardProps) {
  const priority = priorityInfo(task.priority)
  const total = task.subtasks_count ?? task.subtasks?.length ?? 0
  const done = task.subtasks_done_count ?? task.subtasks?.filter((s) => s.completed).length ?? 0
  const group = task.due_at && !task.completed ? dueGroup(task.due_at) : null

  return (
    <article className={`${styles.card} ${task.completed ? styles.cardDone : ''} ${dragging ? styles.cardDragging : ''}`}>
      <div className={styles.cardTop}>
        <span
          className={styles.prio}
          style={{ background: priority.color }}
          title={`Prioridad ${priority.label.toLowerCase()}`}
          aria-label={`Prioridad ${priority.label.toLowerCase()}`}
        >
          {task.priority}
        </span>
        {task.project && (
          <span className={styles.chip} style={chipStyle(task.project.color)}>
            {task.project.name}
          </span>
        )}
        <span className={styles.spacer} />
        {next && (
          <button
            type="button"
            className={styles.moveBtn}
            aria-label={`Mover "${task.title}" a ${next.name}`}
            title={`Mover a ${next.name}`}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={next.onMove}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
      <Link to={`/tareas/${task.id}`} className={styles.cardTitle} draggable={false}>
        {task.title}
      </Link>
      {total > 0 && (
        <div className={styles.progressRow}>
          <span className={styles.progress} aria-hidden="true">
            <span style={{ width: `${Math.round((done / total) * 100)}%`, background: done === total ? 'var(--c-green-dot)' : 'var(--c-blue-dot)' }} />
          </span>
          <span className={styles.progressLabel} aria-label={`${done} de ${total} subtareas`}>
            {done}/{total}
          </span>
        </div>
      )}
      {(task.due_at || !!task.comments_count || !!task.assignees?.length) && (
        <div className={styles.cardMeta}>
          {task.due_at && (
            <span className={`${styles.metaItem} ${group === 'overdue' ? styles.overdue : group === 'today' ? styles.today : ''}`}>
              <Icon name="calendar" size={14} />
              {formatDue(task.due_at)}
            </span>
          )}
          {!!task.comments_count && (
            <span className={styles.metaItem} aria-label={`${task.comments_count} comentarios`}>
              <Icon name="comment" size={14} />
              {task.comments_count}
            </span>
          )}
          <span className={styles.spacer} />
          {!!task.assignees?.length && (
            <span className={styles.avatars} aria-label={`Responsables: ${task.assignees.map((a) => a.name).join(', ')}`}>
              {task.assignees.slice(0, 3).map((a) => (
                <span key={a.id} className={styles.avatar} title={a.name} aria-hidden="true">
                  {initials(a.name)}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
