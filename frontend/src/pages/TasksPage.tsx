import { useState } from 'react'
import { Link } from 'react-router'
import { TaskGroups, TaskList } from '../components/tasks/TaskGroups'
import styles from '../components/tasks/tasks.module.css'
import { ViewFilters } from '../components/views/ViewFilters'
import { ViewHeader } from '../components/views/ViewHeader'
import { useTasks } from '../hooks/useWorkspaceData'
import { dueGroup } from '../lib/dates'
import { NO_FILTERS, toTaskFilters, type ViewFilterValues } from '../lib/viewFilters'
import pageStyles from './pages.module.css'
import { t } from '../lib/i18n'

export function TasksPage() {
  const [filters, setFilters] = useState<ViewFilterValues>(NO_FILTERS)
  const [showCompleted, setShowCompleted] = useState(false)
  const open = useTasks({ ...toTaskFilters(filters), status: 'open' })
  const completed = useTasks({ ...toTaskFilters(filters), status: 'completed' }, showCompleted)
  const tasks = open.data ?? []
  const overdue = tasks.filter((t) => dueGroup(t.due_at) === 'overdue').length

  return (
    <>
      <ViewHeader
        eyebrow={
          open.isPending
            ? t('Cargando…')
            : (tasks.length === 1 ? t('1 abierta') : t('{n} abiertas', { n: tasks.length })) +
              (overdue ? ` · ${overdue === 1 ? t('1 atrasada') : t('{n} atrasadas', { n: overdue })}` : '')
        }
        title={t('Mis tareas')}
        filters={
          <>
            <ViewFilters value={filters} onChange={setFilters} />
            <label className={styles.toggle}>
              <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
              {t('Ver completadas')}
            </label>
          </>
        }
      />

      {open.isError && (
        <p className={pageStyles.error} role="alert">
          {t('No pudimos cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.')}
        </p>
      )}

      {open.isSuccess && tasks.length === 0 && (
        <div className={styles.empty}>
          <strong>{t('Todo al día')}</strong>
          <span>{t('No tienes tareas pendientes.')}</span>
          <Link to="/tareas/nueva">{t('Crear una tarea')}</Link>
        </div>
      )}

      <TaskGroups tasks={tasks} />

      {showCompleted && completed.data && completed.data.length > 0 && (
        <TaskList title={t('Completadas')} tasks={completed.data} />
      )}
    </>
  )
}
