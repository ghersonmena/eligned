import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { TaskForm } from '../components/tasks/TaskForm'
import { useMe } from '../hooks/useAuth'
import { useCreateTask } from '../hooks/useWorkspaceData'
import { emptyTaskValues, toTaskInput } from '../lib/taskForm'
import styles from './detail.module.css'
import pageStyles from './pages.module.css'

/** /tareas/nueva (optionally ?proyecto=ID to pre-select the project). */
export function TaskNewPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: user } = useMe()
  const createTask = useCreateTask()
  const [initial] = useState(() =>
    emptyTaskValues({
      projectId: params.get('proyecto') ?? '',
      // New tasks are assigned to whoever creates them; it can be changed here.
      assigneeIds: user ? [user.id] : [],
    }),
  )

  return (
    <div className={styles.layout}>
      <nav aria-label="Ruta" className={styles.breadcrumb}>
        <Link to="/tareas">Mis tareas</Link>
      </nav>
      <h1 className={pageStyles.pageTitle}>Nueva tarea</h1>
      <section className={pageStyles.card}>
        <TaskForm
          initial={initial}
          submitLabel="Crear tarea"
          pending={createTask.isPending}
          errorMessage={createTask.isError ? 'No se pudo crear la tarea. Revisa los datos e inténtalo de nuevo.' : undefined}
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
