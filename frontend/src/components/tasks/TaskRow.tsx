import { useState } from 'react'
import { Link } from 'react-router'
import type { Task } from '../../api/types'
import { useMe } from '../../hooks/useAuth'
import { useUpdateTask } from '../../hooks/useWorkspaceData'
import { celebrate } from '../../lib/celebrate'
import { chipStyle, priorityInfo } from '../../lib/colors'
import { dueGroup, formatDue } from '../../lib/dates'
import { closesWithSubtasks } from '../../lib/timeline'
import { initials } from '../../lib/initials'
import { Icon } from '../Icon'
import styles from './tasks.module.css'

/** Checkbox that completes/reopens a task, with the confetti celebration. */
export function CompleteCheckbox({ task, className }: { task: Task; className?: string }) {
  const { data: user } = useMe()
  const updateTask = useUpdateTask()

  if (closesWithSubtasks(task)) {
    const total = task.subtasks_count ?? task.subtasks?.length ?? 0
    const done = task.subtasks_done_count ?? task.subtasks?.filter((st) => st.completed).length ?? 0
    const why = `"${task.title}" se completa al cerrar sus subtareas (${done} de ${total} cerradas)`
    return (
      <input type="checkbox" className={className ?? styles.check} checked={task.completed} disabled aria-label={why} title={why} readOnly />
    )
  }

  return (
    <input
      type="checkbox"
      className={className ?? styles.check}
      aria-label={task.completed ? `Reabrir "${task.title}"` : `Completar "${task.title}"`}
      checked={task.completed}
      onChange={(e) => {
        const completed = e.target.checked
        updateTask.mutate({ id: task.id, input: { completed } })
        if (completed) celebrate(user?.preferences.confetti ?? true)
      }}
    />
  )
}

export function TaskRow({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const priority = priorityInfo(task.priority)
  const group = task.due_at && !task.completed ? dueGroup(task.due_at) : null
  const dueClass = group === 'overdue' ? styles.overdue : group === 'today' ? styles.today : undefined
  const subtasks = task.subtasks ?? []
  const subtasksId = `subtasks-${task.id}`

  return (
    <li className={styles.rowItem}>
      <div className={`${styles.row} ${task.completed ? styles.done : ''}`}>
        <CompleteCheckbox task={task} />
        <Link to={`/tareas/${task.id}`} className={styles.rowMain}>
          <span className={styles.rowTitle}>{task.title}</span>
          <span className={styles.meta}>
            {showProject && task.project && (
              <span className={styles.chip} style={chipStyle(task.project.color)}>
                {task.project.name}
              </span>
            )}
            {task.due_at && (
              <span className={`${styles.metaItem} ${dueClass ?? ''}`}>
                <Icon name="calendar" size={14} />
                {formatDue(task.due_at)}
              </span>
            )}
            {!!task.comments_count && (
              <span className={styles.metaItem}>
                <Icon name="comment" size={14} />
                {task.comments_count}
              </span>
            )}
          </span>
        </Link>
        {subtasks.length > 0 && (
          <button
            type="button"
            className={styles.expand}
            aria-expanded={expanded}
            aria-controls={subtasksId}
            aria-label={`${expanded ? 'Ocultar' : 'Ver'} subtareas de "${task.title}"`}
            onClick={() => setExpanded((v) => !v)}
          >
            <Icon name="tasks" size={14} />
            {subtasks.filter((st) => st.completed).length}/{subtasks.length}
            <Icon name="chevronDown" size={14} />
          </button>
        )}
        <span
          className={styles.priority}
          style={{ background: priority.color }}
          title={`Prioridad ${priority.label.toLowerCase()}`}
          aria-label={`Prioridad ${priority.label.toLowerCase()}`}
        >
          {task.priority}
        </span>
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
      {expanded && (
        <ul id={subtasksId} className={styles.subtaskList} aria-label={`Subtareas de "${task.title}"`}>
          {subtasks.map((st) => (
            <li key={st.id} className={`${styles.subtaskRow} ${st.completed ? styles.done : ''}`}>
              <CompleteCheckbox task={st} />
              <Link to={`/tareas/${st.id}`} className={styles.rowMain}>
                <span className={styles.rowTitle}>{st.title}</span>
                {st.due_at && !st.completed && (
                  <span className={styles.meta}>
                    <span className={styles.metaItem}>
                      <Icon name="calendar" size={14} />
                      {formatDue(st.due_at)}
                    </span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
