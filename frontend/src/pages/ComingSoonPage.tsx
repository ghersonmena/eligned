import type { NavItem } from '../navigation'
import styles from './pages.module.css'

export function ComingSoonPage({ item }: { item: NavItem }) {
  return (
    <>
      <h1 className={styles.pageTitle}>{item.label}</h1>
      <section className={styles.card}>
        <h2>Todavía en construcción</h2>
        <p>Esta sección llega en la fase {item.phase} de la hoja de ruta.</p>
      </section>
    </>
  )
}
