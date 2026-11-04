import { useState } from 'react'
import { Link } from 'react-router'
import type { TaskFilters } from '../api/types'
import { TaskGroups, TaskList } from '../components/tasks/TaskGroups'
import styles from '../components/tasks/tasks.module.css'
import { useProjects, useTasks } from '../hooks/useWorkspaceData'
import { dueGroup } from '../lib/dates'
import pageStyles from './pages.module.css'

export function TasksPage() {
  const [mine, setMine] = useState(false)
  const [projectId, setProjectId] = useState<string>('')
  const [showCompleted, setShowCompleted] = useState(false)
  const { data: projects = [] } = useProjects()

  const filters: TaskFilters = {
    ...(mine ? { assignee: 'me' as const } : {}),
    ...(projectId ? { project_id: Number(projectId) } : {}),
  }
  const open = useTasks({ ...filters, status: 'open' })
  const completed = useTasks({ ...filters, status: 'completed' }, showCompleted)
  const tasks = open.data ?? []
  const overdue = tasks.filter((t) => dueGroup(t.due_at) === 'overdue').length

  return (
    <>
      <div className={pageStyles.headerRow}>
        <div>
        <span className={pageStyles.eyebrow}>
          {open.isPending ? 'Cargando…' : `${tasks.length} abiertas${overdue ? ` · ${overdue} atrasadas` : ''}`}
        </span>
        <h1 className={pageStyles.pageTitle}>Mis tareas</h1>
        </div>
        <Link to="/tareas/nueva" className={`${pageStyles.primary} ${pageStyles.buttonLink}`}>
          + Nueva tarea
        </Link>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.segmented} role="group" aria-label="Mostrar">
          <button type="button" className={styles.segment} aria-pressed={!mine} onClick={() => setMine(false)}>
            Todas
          </button>
          <button type="button" className={styles.segment} aria-pressed={mine} onClick={() => setMine(true)}>
            Asignadas a mí
          </button>
        </div>
        {projects.length > 0 && (
          <select
            className={styles.select}
            aria-label="Filtrar por proyecto"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <label className={styles.toggle}>
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          Ver completadas
        </label>
      </div>

      {open.isError && (
        <p className={pageStyles.error} role="alert">
          No pudimos cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}

      {open.isSuccess && tasks.length === 0 && (
        <div className={styles.empty}>
          <strong>Todo al día</strong>
          <span>No tienes tareas pendientes.</span>
          <Link to="/tareas/nueva">Crear una tarea</Link>
        </div>
      )}

      <TaskGroups tasks={tasks} />

      {showCompleted && completed.data && completed.data.length > 0 && (
        <TaskList title="Completadas" tasks={completed.data} />
      )}
    </>
  )
}
