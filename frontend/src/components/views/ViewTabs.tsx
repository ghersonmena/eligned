import { NavLink } from 'react-router'
import { VIEW_TABS } from '../../navigation'
import styles from './views.module.css'
import { t } from '../../lib/i18n'

/** Lista · Tablero · Calendario · Cronograma. */
export function ViewTabs() {
  return (
    <nav aria-label={t('Vistas de tareas')} className={styles.tabs}>
      {VIEW_TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={styles.tab}>
          {t(tab.label)}
        </NavLink>
      ))}
    </nav>
  )
}
