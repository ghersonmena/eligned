import { useState, type FormEvent } from 'react'
import type { Priority } from '../../api/types'
import { useMe } from '../../hooks/useAuth'
import { useCreateTask, useProjects } from '../../hooks/useWorkspaceData'
import { PRIORITIES } from '../../lib/colors'
import { shortcutDate } from '../../lib/dates'
import styles from './tasks.module.css'

type When = '' | 'today' | 'tomorrow' | 'nextWeek'

interface QuickAddProps {
  /** Pre-selects (and hides) the project, e.g. inside a project page. */
  projectId?: number
  autoFocus?: boolean
}

/** Type a title, press Enter. Optional: when, priority and project. */
export function QuickAdd({ projectId, autoFocus }: QuickAddProps) {
  const { data: user } = useMe()
  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState<When>('')
  const [priority, setPriority] = useState<Priority>(2)
  const [project, setProject] = useState<string>('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    createTask.mutate(
      {
        title: trimmed,
        priority,
        due_at: when ? shortcutDate(when) : null,
        project_id: projectId ?? (project ? Number(project) : null),
        // New tasks are assigned to whoever creates them.
        assignee_ids: user ? [user.id] : [],
      },
      { onSuccess: () => setTitle('') },
    )
  }

  return (
    <form className={styles.quickAdd} onSubmit={onSubmit}>
      <label className="visually-hidden" htmlFor="quick-add">
        Nueva tarea
      </label>
      <input
        id="quick-add"
        className={styles.quickAddInput}
        placeholder="Agregar una tarea y pulsar Enter"
        value={title}
        maxLength={255}
        autoFocus={autoFocus}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className={styles.quickAddOptions}>
        <select className={styles.select} aria-label="Fecha" value={when} onChange={(e) => setWhen(e.target.value as When)}>
          <option value="">Sin fecha</option>
          <option value="today">Hoy</option>
          <option value="tomorrow">Mañana</option>
          <option value="nextWeek">En una semana</option>
        </select>
        <select
          className={styles.select}
          aria-label="Prioridad"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value) as Priority)}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              Prioridad {p.label.toLowerCase()}
            </option>
          ))}
        </select>
        {projectId === undefined && projects.length > 0 && (
          <select className={styles.select} aria-label="Proyecto" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className={styles.quickAddButton} disabled={!title.trim() || createTask.isPending}>
          {createTask.isPending ? 'Guardando…' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}
