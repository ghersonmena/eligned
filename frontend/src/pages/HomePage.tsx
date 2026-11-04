import { useState } from 'react'
import { Link } from 'react-router'
import type { User } from '../api/auth'
import { TaskRow } from '../components/tasks/TaskRow'
import taskStyles from '../components/tasks/tasks.module.css'
import { useTasks } from '../hooks/useWorkspaceData'
import { celebrate } from '../lib/celebrate'
import { dueGroup } from '../lib/dates'
import styles from './pages.module.css'

function greetingFor(hour: number) {
  if (hour < 12) return 'Buenos días,'
  if (hour < 19) return 'Buenas tardes,'
  return 'Buenas noches,'
}

export function HomePage({ user }: { user: User }) {
  const [hour] = useState(() => new Date().getHours())
  const firstName = user.name.split(' ')[0]
  const { data: tasks = [], isPending } = useTasks({ status: 'open' })
  const today = tasks.filter((t) => ['overdue', 'today'].includes(dueGroup(t.due_at)))

  return (
    <>
      <h1 className={styles.greeting}>
        <span>{greetingFor(hour)}</span> {firstName}
      </h1>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Para hoy</h2>
          {isPending && <p>Cargando…</p>}
          {!isPending && today.length === 0 && (
            <p>Nada pendiente para hoy. {tasks.length > 0 ? `Tienes ${tasks.length} tareas abiertas más adelante.` : ''}</p>
          )}
          {today.length > 0 && (
            <ul className={taskStyles.list}>
              {today.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
          <Link to="/tareas">Ver todas mis tareas</Link>
        </section>
        <section className={`${styles.card} ${styles.cardTracker}`}>
          <h2>Registro de tiempo</h2>
          <p>El cronómetro de tareas llega en la fase 3.</p>
        </section>
        <section className={`${styles.card} ${styles.cardInk}`}>
          <h2>Logros</h2>
          <p>Así se celebra cada tarea completada.</p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => celebrate(user.preferences.confetti)}
          >
            Probar animación de logro
          </button>
        </section>
      </div>
    </>
  )
}
