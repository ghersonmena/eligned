import { useState } from 'react'
import type { User } from '../api/auth'
import { celebrate } from '../lib/celebrate'
import styles from './pages.module.css'

function greetingFor(hour: number) {
  if (hour < 12) return 'Buenos días,'
  if (hour < 19) return 'Buenas tardes,'
  return 'Buenas noches,'
}

export function HomePage({ user }: { user: User }) {
  const [hour] = useState(() => new Date().getHours())
  const firstName = user.name.split(' ')[0]
  const workspace = user.workspaces[0]

  return (
    <>
      <h1 className={styles.greeting}>
        <span>{greetingFor(hour)}</span> {firstName}
      </h1>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Tu espacio está listo</h2>
          <p>
            Estás en <strong>{workspace?.name ?? 'tu espacio personal'}</strong>. Aquí verás tus tareas, la lista
            rápida y los recordatorios cuando terminemos la fase 1.
          </p>
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
