import { Link } from 'react-router'
import { useWorkload } from '../../hooks/useTeam'
import { formatMinutes } from '../../lib/activity'
import { initials } from '../../lib/initials'
import styles from './workload.module.css'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "Carga del equipo": how many open tasks each person has, and how urgent they are. */
export function WorkloadSection({ meId, className }: { meId: number; className: string }) {
  const { data, isPending } = useWorkload()
  const rows = data?.data ?? []
  const max = Math.max(1, ...rows.map((r) => r.open))

  return (
    <section className={className} aria-labelledby="workload-title">
      <h2 id="workload-title">Carga del equipo</h2>
      {isPending && <p>Cargando…</p>}
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
                    {r.user.id === meId && <span className={styles.you}> (tú)</span>}
                  </strong>
                  <span className={styles.open}>{plural(r.open, 'abierta', 'abiertas')}</span>
                </div>
                <div
                  className={styles.bar}
                  role="img"
                  aria-label={`${plural(r.overdue, 'atrasada', 'atrasadas')}, ${r.this_week} en los próximos 7 días, ${later} después o sin fecha`}
                >
                  {r.overdue > 0 && <span className={styles.overdue} style={{ width: pct(r.overdue) }} />}
                  {r.this_week > 0 && <span className={styles.week} style={{ width: pct(r.this_week) }} />}
                  {later > 0 && <span className={styles.later} style={{ width: pct(later) }} />}
                </div>
                <div className={styles.meta}>
                  {r.overdue > 0 && <span className={styles.metaOverdue}>{plural(r.overdue, 'atrasada', 'atrasadas')}</span>}
                  {r.this_week > 0 && <span>{r.this_week} en los próximos 7 días</span>}
                  <span>✓ {plural(r.done_since, 'terminada', 'terminadas')} desde el lunes</span>
                  <span>⏱ {formatMinutes(r.minutes_since)}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <div className={styles.legend} aria-hidden="true">
        <span>
          <i className={styles.overdue} /> Atrasadas
        </span>
        <span>
          <i className={styles.week} /> Próximos 7 días
        </span>
        <span>
          <i className={styles.later} /> Después o sin fecha
        </span>
      </div>
      {!!data?.unassigned && (
        <p className={styles.unassigned}>
          {plural(data.unassigned, 'tarea abierta no tiene', 'tareas abiertas no tienen')} responsable. <Link to="/tareas">Ver tareas</Link>
        </p>
      )}
    </section>
  )
}
