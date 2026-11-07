import type { NavItem } from '../navigation'
import styles from './pages.module.css'
import { t } from '../lib/i18n'

export function ComingSoonPage({ item }: { item: NavItem }) {
  return (
    <>
      <h1 className={styles.pageTitle}>{t(item.label)}</h1>
      <section className={styles.card}>
        <h2>{t('Todavía en construcción')}</h2>
        <p>{t('Esta sección llega en la fase {phase} de la hoja de ruta.', { phase: item.phase ?? '' })}</p>
      </section>
    </>
  )
}
