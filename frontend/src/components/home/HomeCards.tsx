import { Link } from 'react-router'
import { TaskRow } from '../tasks/TaskRow'
import taskStyles from '../tasks/tasks.module.css'
import { ProgressRing } from '../goals/ProgressRing'
import { useGoals } from '../../hooks/useGoals'
import { useSummary, useWorkload } from '../../hooks/useTeam'
import { useProjects, useTasks } from '../../hooks/useWorkspaceData'
import { formatMinutes, formatMinutesShort } from '../../lib/activity'
import { dotColor } from '../../lib/colors'
import { dueGroup } from '../../lib/dates'
import { HEALTH } from '../../lib/goals'
import { initials } from '../../lib/initials'
import pageStyles from '../../pages/pages.module.css'
import styles from './home.module.css'
import { t } from '../../lib/i18n'

const pct = (done: number, pending: number) => (done + pending === 0 ? 0 : Math.round((done / (done + pending)) * 100))

/** Dark card with three rings: my day, my week and time today. */
export function ActivityCard({ className }: { className: string }) {
  const { data } = useSummary()
  const s = data ?? { done_today: 0, pending_today: 0, done_week: 0, pending_week: 0, overdue: 0, minutes_today: 0, minutes_week: 0 }
  const rings = [
    { title: t('Hoy'), value: pct(s.done_today, s.pending_today), label: `${s.done_today}/${s.done_today + s.pending_today}`, color: '#fb923c', note: t('terminadas') },
    { title: t('Semana'), value: pct(s.done_week, s.pending_week), label: `${s.done_week}/${s.done_week + s.pending_week}`, color: '#2dd4bf', note: t('terminadas') },
    { title: t('Tiempo'), value: Math.round((s.minutes_today / 480) * 100), label: formatMinutesShort(s.minutes_today), color: '#fbbf24', note: t('de 8 h hoy') },
  ]
  return (
    <section className={`${className} ${pageStyles.cardInk}`}>
      <h2>{t('Actividad')}</h2>
      <div className={styles.rings}>
        {rings.map((r) => (
          <div key={r.title} className={styles.ring}>
            <ProgressRing value={r.value} color={r.color} size={92} stroke={9} track="rgb(255 255 255 / 12%)" label={r.label} />
            <strong>{r.title}</strong>
            <span>{r.note}</span>
          </div>
        ))}
      </div>
      <p>
        {s.overdue === 0 ? t('¡Nada atrasado!') : s.overdue === 1 ? t('Tienes 1 tarea atrasada.') : t('Tienes {n} tareas atrasadas.', { n: s.overdue })}{' '}
        {t('Esta semana registraste {time}.', { time: formatMinutes(s.minutes_week) })}
      </p>
    </section>
  )
}

export function GoalsCard({ className }: { className: string }) {
  const { data: goals = [], isPending } = useGoals()
  return (
    <section className={className}>
      <h2>{t('Metas')}</h2>
      {isPending && <p>{t('Cargando…')}</p>}
      {!isPending && goals.length === 0 && <p>{t('Aún no tienes metas. Define un objetivo y mídelo con resultados clave.')}</p>}
      <ul className={styles.bars}>
        {goals.slice(0, 5).map((g) => (
          <li key={g.id}>
            <Link to={`/metas/${g.id}`} className={styles.barLink}>
              <span className={styles.barTitle}>{g.title}</span>
              <span className={styles.barPct} style={{ color: HEALTH[g.health].color }}>
                {g.progress}%
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${g.progress}%`, background: dotColor(g.color) }} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/metas" className={styles.more}>
        {t('Ver metas')}
      </Link>
    </section>
  )
}

export function UpcomingCard({ className }: { className: string }) {
  const { data: tasks = [], isPending } = useTasks({ status: 'open' })
  const upcoming = tasks
    .filter((t) => ['tomorrow', 'week'].includes(dueGroup(t.due_at)))
    .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))
  return (
    <section className={`${className} ${pageStyles.cardToday}`}>
      <h2>
        {t('Próximos 7 días')}
        {upcoming.length > 0 && <span className={pageStyles.count}> · {upcoming.length}</span>}
      </h2>
      {isPending && <p>{t('Cargando…')}</p>}
      {!isPending && upcoming.length === 0 && <p>{t('Nada vence en los próximos días.')}</p>}
      {upcoming.length > 0 && (
        <div className={pageStyles.cardScroll} tabIndex={0} aria-label={t('Tareas de los próximos 7 días')}>
          <ul className={taskStyles.list}>
            {upcoming.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}
      <Link to="/calendario">{t('Ver calendario')}</Link>
    </section>
  )
}

export function ProjectsCard({ className }: { className: string }) {
  const { data: projects = [], isPending } = useProjects()
  const rows = projects
    .map((p) => {
      const open = p.open_tasks_count ?? 0
      const done = p.done_tasks_count ?? 0
      return { p, open, pct: pct(done, open) }
    })
    .filter((r) => r.open > 0)
    .sort((a, b) => b.open - a.open)
  return (
    <section className={className}>
      <h2>{t('Proyectos')}</h2>
      {isPending && <p>{t('Cargando…')}</p>}
      {!isPending && rows.length === 0 && <p>{t('Ningún proyecto tiene tareas pendientes.')}</p>}
      <ul className={styles.bars}>
        {rows.slice(0, 6).map(({ p, open, pct: value }) => (
          <li key={p.id}>
            <Link to={`/proyectos/${p.id}`} className={styles.barLink}>
              <span className={styles.barTitle}>{p.name}</span>
              <span className={styles.barPct}>
                {open === 1 ? t('1 abierta') : t('{n} abiertas', { n: open })}
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${value}%`, background: dotColor(p.color) }} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/proyectos" className={styles.more}>
        {t('Ver proyectos')}
      </Link>
    </section>
  )
}

export function TeamCard({ className }: { className: string }) {
  const { data } = useWorkload()
  const rows = data?.data ?? []
  const max = Math.max(1, ...rows.map((r) => r.open))
  return (
    <section className={className}>
      <h2>{t('Carga del equipo')}</h2>
      {rows.length <= 1 ? (
        <p>{t('Trabajas solo en este espacio. Invita a alguien para repartir tareas y ver aquí cuánto tiene cada quien.')}</p>
      ) : (
        <ul className={styles.people}>
          {rows.map((r) => (
            <li key={r.user.id}>
              <span className={styles.avatar} aria-hidden="true">
                {initials(r.user.name)}
              </span>
              <span className={styles.personName}>{r.user.name}</span>
              <span className={styles.barPct}>
                {r.open}
                {r.overdue > 0 && <em> · {r.overdue === 1 ? t('1 atrasada') : t('{n} atrasadas', { n: r.overdue })}</em>}
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${(r.open / max) * 100}%`, background: r.overdue ? '#dc2626' : 'var(--accent)' }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/equipo" className={styles.more}>
        {rows.length <= 1 ? t('Invitar a alguien') : t('Ver equipo')}
      </Link>
    </section>
  )
}
