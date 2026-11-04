import { NavLink } from 'react-router'
import { VIEW_TABS } from '../../navigation'
import styles from './views.module.css'

/** Lista · Tablero · Calendario · Cronograma. */
export function ViewTabs() {
  return (
    <nav aria-label="Vistas de tareas" className={styles.tabs}>
      {VIEW_TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={styles.tab}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
