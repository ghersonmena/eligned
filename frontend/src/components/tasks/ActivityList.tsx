import { useState } from 'react'
import { useTaskActivity } from '../../hooks/useWorkspaceData'
import { describeActivity, isAutomatic } from '../../lib/activity'
import { initials } from '../../lib/initials'
import styles from './ActivityList.module.css'
import { dateFormat, t } from '../../lib/i18n'

const when = { format: (d: Date) => dateFormat({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d) }
const SHOWN = 6

/** "Historial": who did what to the task, and when (newest first). */
export function ActivityList({ taskId }: { taskId: number }) {
  const { data: entries = [], isPending, isError } = useTaskActivity(taskId)
  const [all, setAll] = useState(false)
  const rows = entries.flatMap((a) => describeActivity(a).map((text, i) => ({ key: `${a.id}-${i}`, a, text })))
  const visible = all ? rows : rows.slice(0, SHOWN)

  return (
    <section className={styles.card} aria-labelledby="history-title">
      <h2 id="history-title">{t('Historial')}</h2>
      {isPending && <p className={styles.note}>{t('Cargando historial…')}</p>}
      {isError && <p className={styles.note}>{t('No se pudo cargar el historial.')}</p>}
      {!isPending && rows.length === 0 && <p className={styles.note}>{t('Todavía no hay movimientos.')}</p>}
      <ol className={styles.list}>
        {visible.map(({ key, a, text }) => {
          const auto = isAutomatic(a) && a.event === 'updated'
          const who = auto ? t('Automático') : (a.user?.name ?? t('Alguien'))
          return (
            <li key={key} className={styles.item}>
              <span className={`${styles.avatar} ${auto ? styles.auto : ''}`} aria-hidden="true">
                {auto ? '⚙' : initials(who)}
              </span>
              <span className={styles.body}>
                <span>
                  <strong>{auto ? capitalize(text) : who}</strong>
                  {auto ? '' : ` ${text}`}
                </span>
                <time dateTime={a.created_at} className={styles.time}>
                  {when.format(new Date(a.created_at))}
                </time>
              </span>
            </li>
          )
        })}
      </ol>
      {rows.length > SHOWN && (
        <button type="button" className={styles.more} onClick={() => setAll(!all)}>
          {all ? t('Ver menos') : t('Ver todo ({n})', { n: rows.length })}
        </button>
      )}
    </section>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
