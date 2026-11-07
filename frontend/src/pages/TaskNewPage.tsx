import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { TaskForm } from '../components/tasks/TaskForm'
import { useMe } from '../hooks/useAuth'
import { useCreateTask } from '../hooks/useWorkspaceData'
import { emptyTaskValues, toTaskInput } from '../lib/taskForm'
import styles from './detail.module.css'
import pageStyles from './pages.module.css'
import { t } from '../lib/i18n'

/**
 * /tareas/nueva. Optional query params pre-fill the form: ?proyecto=ID,
 * ?estado=ID (Kanban column) and ?fecha=YYYY-MM-DD (calendar day).
 */
export function TaskNewPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: user } = useMe()
  const createTask = useCreateTask()
  const [initial] = useState(() =>
    emptyTaskValues({
      projectId: params.get('proyecto') ?? '',
      statusId: params.get('estado') ?? '',
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(params.get('fecha') ?? '') ? (params.get('fecha') as string) : '',
      // New tasks are assigned to whoever creates them; it can be changed here.
      assigneeIds: user ? [user.id] : [],
    }),
  )

  return (
    <div className={styles.layout}>
      <nav aria-label={t('Ruta')} className={styles.breadcrumb}>
        <Link to="/tareas">{t('Mis tareas')}</Link>
      </nav>
      <h1 className={pageStyles.pageTitle}>{t('Nueva tarea')}</h1>
      <section className={pageStyles.card}>
        <TaskForm
          initial={initial}
          submitLabel={t('Crear tarea')}
          pending={createTask.isPending}
          errorMessage={createTask.isError ? t('No se pudo crear la tarea. Revisa los datos e inténtalo de nuevo.') : undefined}
          onSubmit={async (values) => {
            const task = await createTask.mutateAsync(toTaskInput(values))
            navigate(`/tareas/${task.id}`, { replace: true })
          }}
          onCancel={() => navigate(-1)}
        />
      </section>
    </div>
  )
}
