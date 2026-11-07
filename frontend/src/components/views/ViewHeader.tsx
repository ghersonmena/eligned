import type { ReactNode } from 'react'
import { Link } from 'react-router'
import pageStyles from '../../pages/pages.module.css'
import taskStyles from '../tasks/tasks.module.css'
import { ViewTabs } from './ViewTabs'
import styles from './views.module.css'

interface ViewHeaderProps {
  eyebrow: string
  title: string
  /** Extra controls next to the title (date navigation, scale…). */
  aside?: ReactNode
  /** Filters shown next to the tabs. */
  filters?: ReactNode
  newTaskHref?: string
}

/** Title, view tabs, filters and "+ Nueva tarea": the same on every task view. */
export function ViewHeader({ eyebrow, title, aside, filters, newTaskHref = '/tareas/nueva' }: ViewHeaderProps) {
  return (
    <>
      <div className={pageStyles.headerRow}>
        <div className={styles.titleBlock}>
          <span className={pageStyles.eyebrow}>{eyebrow}</span>
          <h1 className={pageStyles.pageTitle}>{title}</h1>
        </div>
        {aside}
      </div>
      <div className={`${taskStyles.toolbar} ${styles.toolbar}`}>
        <ViewTabs />
        <span className={styles.spacer} />
        {filters}
        <Link to={newTaskHref} className={`${pageStyles.primary} ${pageStyles.buttonLink} ${styles.newTask}`}>
          + Nueva tarea
        </Link>
      </div>
    </>
  )
}
