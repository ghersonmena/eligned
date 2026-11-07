import { Link } from 'react-router'
import { useWorkload } from '../../hooks/useTeam'
import { formatMinutes } from '../../lib/activity'
import { initials } from '../../lib/initials'
import styles from './workload.module.css'
import { t } from '../../lib/i18n'


/** "Carga del equipo": how many open tasks each person has, and how urgent they are. */
export function WorkloadSection({ meId, className }: { meId: number; className: string }) {
  const { data, isPending } = useWorkload()
  const rows = data?.data ?? []
  const max = Math.max(1, ...rows.map((r) => r.open))

  return (
    <section className={className} aria-labelledby="workload-title">
      <h2 id="workload-title">{t('Carga del equipo')}</h2>
      {isPending && <p>{t('Cargando…')}</p>}
      <ul className={styles.list}>
        {rows.map((r) => {
          const later = r.open - r.overdue - r.this_week
          const pct = (n: number) => `${(n / max) * 100}%`
          return (
            <li key={r.user.id} className={styles.row}>
              <span className={styles.avatar} aria-hidden="true">
                {initials(r.user.name)}
              </span>
              <div className={styles.main}>
                <div className={styles.top}>
                  <strong>
                    {r.user.name}
                    {r.user.id === meId && <span className={styles.you}> {t('(tú)')}</span>}
                  </strong>
                  <span className={styles.open}>{r.open === 1 ? t('1 abierta') : t('{n} abiertas', { n: r.open })}</span>
                </div>
                <div
                  className={styles.bar}
                  role="img"
                  aria-label={t('{overdue} atrasadas, {week} en los próximos 7 días, {later} después o sin fecha', { overdue: r.overdue, week: r.this_week, later })}
                >
                  {r.overdue > 0 && <span className={styles.overdue} style={{ width: pct(r.overdue) }} />}
                  {r.this_week > 0 && <span className={styles.week} style={{ width: pct(r.this_week) }} />}
                  {later > 0 && <span className={styles.later} style={{ width: pct(later) }} />}
                </div>
                <div className={styles.meta}>
                  {r.overdue > 0 && <span className={styles.metaOverdue}>{r.overdue === 1 ? t('1 atrasada') : t('{n} atrasadas', { n: r.overdue })}</span>}
                  {r.this_week > 0 && <span>{t('{n} en los próximos 7 días', { n: r.this_week })}</span>}
                  <span>✓ {r.done_since === 1 ? t('1 terminada desde el lunes') : t('{n} terminadas desde el lunes', { n: r.done_since })}</span>
                  <span>⏱ {formatMinutes(r.minutes_since)}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <div className={styles.legend} aria-hidden="true">
        <span>
          <i className={styles.overdue} /> {t('Atrasadas')}
        </span>
        <span>
          <i className={styles.week} /> {t('Próximos 7 días')}
        </span>
        <span>
          <i className={styles.later} /> {t('Después o sin fecha')}
        </span>
      </div>
      {!!data?.unassigned && (
        <p className={styles.unassigned}>
          {data.unassigned === 1 ? t('1 tarea abierta no tiene responsable.') : t('{n} tareas abiertas no tienen responsable.', { n: data.unassigned })}{' '}
          <Link to="/tareas">{t('Ver tareas')}</Link>
        </p>
      )}
    </section>
  )
}
