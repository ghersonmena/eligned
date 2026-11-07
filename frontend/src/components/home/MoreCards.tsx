import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { Priority } from '../../api/types'
import { useInsights } from '../../hooks/useTeam'
import { useCreateTask, useTasks } from '../../hooks/useWorkspaceData'
import { formatMinutes, timeAgo } from '../../lib/activity'
import { dotColor } from '../../lib/colors'
import { formatDue, shortcutDate } from '../../lib/dates'
import { dailyCounts, streak } from '../../lib/insights'
import { initials } from '../../lib/initials'
import pageStyles from '../../pages/pages.module.css'
import { TaskRow } from '../tasks/TaskRow'
import taskStyles from '../tasks/tasks.module.css'
import styles from './home.module.css'
import { dateFormat } from '../../lib/i18n'

type When = 'none' | 'today' | 'tomorrow' | 'nextWeek'

const WHEN: { id: When; label: string }[] = [
  { id: 'none', label: 'Sin fecha' },
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'nextWeek', label: 'En 7 días' },
]

/** Write a task down without leaving the home page. */
export function QuickAddCard({ className, canEdit }: { className: string; canEdit: boolean }) {
  const createTask = useCreateTask()
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState<When>('today')
  const [urgent, setUrgent] = useState(false)
  const [added, setAdded] = useState<{ id: number; title: string } | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = title.trim()
    if (!text || createTask.isPending) return
    createTask.mutate(
      { title: text, due_at: when === 'none' ? null : shortcutDate(when), priority: (urgent ? 1 : 2) as Priority },
      {
        onSuccess: (task) => {
          setTitle('')
          setUrgent(false)
          setAdded({ id: task.id, title: task.title })
        },
      },
    )
  }

  return (
    <section className={className}>
      <h2>Captura rápida</h2>
      {!canEdit ? (
        <p>En este espacio eres invitado: puedes ver las tareas, pero no crearlas.</p>
      ) : (
        <form className={styles.quick} onSubmit={submit}>
          <input
            className="caps"
            autoCapitalize="characters"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¿Qué hay que hacer?"
            aria-label="Nueva tarea"
            maxLength={255}
          />
          <div className={styles.chips} role="radiogroup" aria-label="Para cuándo">
            {WHEN.map((w) => (
              <button key={w.id} type="button" role="radio" aria-checked={when === w.id} onClick={() => setWhen(w.id)}>
                {w.label}
              </button>
            ))}
            <button type="button" aria-pressed={urgent} className={styles.chipUrgent} onClick={() => setUrgent(!urgent)}>
              ⚑ Alta
            </button>
          </div>
          <button type="submit" className={pageStyles.primary} disabled={!title.trim() || createTask.isPending}>
            {createTask.isPending ? 'Agregando…' : 'Agregar tarea'}
          </button>
          <p role="status" className={styles.quickStatus}>
            {createTask.isError && 'No se pudo agregar. Inténtalo de nuevo.'}
            {added && !createTask.isError && (
              <>
                Agregada: <Link to={`/tareas/${added.id}`}>{added.title}</Link>
              </>
            )}
          </p>
        </form>
      )}
    </section>
  )
}

/** Open high-priority tasks, the soonest first. */
export function PriorityCard({ className }: { className: string }) {
  const { data: tasks = [], isPending } = useTasks({ status: 'open' })
  const urgent = tasks.filter((t) => t.priority === 1)
  return (
    <section className={`${className} ${pageStyles.cardToday}`}>
      <h2>
        Prioridad alta{urgent.length > 0 && <span className={pageStyles.count}> · {urgent.length}</span>}
      </h2>
      {isPending && <p>Cargando…</p>}
      {!isPending && urgent.length === 0 && <p>No hay tareas abiertas con prioridad alta.</p>}
      {urgent.length > 0 && (
        <div className={pageStyles.cardScroll} tabIndex={0} aria-label="Tareas de prioridad alta">
          <ul className={taskStyles.list}>
            {urgent.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}
      <Link to="/tareas" className={styles.more}>
        Ver todas mis tareas
      </Link>
    </section>
  )
}

const weekday = { format: (d: Date) => dateFormat({ weekday: 'narrow' }).format(d) }
const longDay = { format: (d: Date) => dateFormat({ weekday: 'long', day: 'numeric', month: 'short' }).format(d) }

/** Finished tasks per day for two weeks, plus the streak. */
export function RhythmCard({ className }: { className: string }) {
  const { data, isPending } = useInsights()
  const counts = dailyCounts(data?.completed ?? [])
  const max = Math.max(1, ...counts.map((c) => c.count))
  const thisWeek = counts.slice(7).reduce((s, c) => s + c.count, 0)
  const lastWeek = counts.slice(0, 7).reduce((s, c) => s + c.count, 0)
  const days = streak(counts)
  const diff = thisWeek - lastWeek

  return (
    <section className={className}>
      <h2>Ritmo</h2>
      <div className={styles.rhythmStats}>
        <div>
          <strong>{days}</strong>
          <span>{days === 1 ? 'día seguido' : 'días seguidos'}</span>
        </div>
        <div>
          <strong>{thisWeek}</strong>
          <span>últimos 7 días</span>
        </div>
        <div>
          <strong className={diff > 0 ? styles.up : diff < 0 ? styles.down : undefined}>
            {diff > 0 ? `+${diff}` : diff}
          </strong>
          <span>vs. 7 días antes</span>
        </div>
      </div>
      <ol className={styles.columns} aria-label="Tareas terminadas por día">
        {counts.map((c, i) => (
          <li key={i} title={`${longDay.format(c.day)}: ${c.count}`} className={i === counts.length - 1 ? styles.columnToday : undefined}>
            <span className={styles.columnTrack}>
              <span style={{ height: `${(c.count / max) * 100}%` }} />
            </span>
            <small aria-hidden="true">{weekday.format(c.day)}</small>
            <span className="visually-hidden">
              {longDay.format(c.day)}: {c.count}
            </span>
          </li>
        ))}
      </ol>
      <p>
        {isPending
          ? 'Cargando…'
          : days >= 3
            ? `¡Llevas ${days} días seguidos terminando algo! Sigue así.`
            : 'Termina al menos una tarea al día para mantener la racha.'}
      </p>
    </section>
  )
}

/** Where my logged time went this week. */
export function TimeByProjectCard({ className }: { className: string }) {
  const { data, isPending } = useInsights()
  const rows = data?.time_by_project ?? []
  const total = rows.reduce((s, r) => s + r.minutes, 0)
  const max = Math.max(1, ...rows.map((r) => r.minutes))
  return (
    <section className={className}>
      <h2>
        Tiempo por proyecto{total > 0 && <span className={pageStyles.count}> · {formatMinutes(total)}</span>}
      </h2>
      {isPending && <p>Cargando…</p>}
      {!isPending && rows.length === 0 && <p>Esta semana aún no registras tiempo. Usa el cronómetro de una tarea para empezar.</p>}
      <ul className={styles.bars}>
        {rows.slice(0, 6).map((r) => (
          <li key={r.project?.id ?? 0} className={styles.barLink}>
            <span className={styles.barTitle}>
              {r.project ? <Link to={`/proyectos/${r.project.id}`}>{r.project.name}</Link> : 'Sin proyecto'}
            </span>
            <span className={styles.barPct}>
              {formatMinutes(r.minutes)} · {Math.round((r.minutes / total) * 100)}%
            </span>
            <span className={styles.bar} aria-hidden="true">
              <span style={{ width: `${(r.minutes / max) * 100}%`, background: r.project ? dotColor(r.project.color) : 'var(--muted)' }} />
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 0 && <p className={styles.note}>Desde el lunes, solo tu tiempo.</p>}
    </section>
  )
}

/** Open tasks nobody has moved in a while: still relevant? */
export function StaleCard({ className }: { className: string }) {
  const { data, isPending } = useInsights()
  const rows = data?.stale ?? []
  const count = data?.stale_count ?? 0
  return (
    <section className={className}>
      <h2>
        Sin movimiento{count > 0 && <span className={pageStyles.count}> · {count}</span>}
      </h2>
      {isPending && <p>Cargando…</p>}
      {!isPending && count === 0 && <p>Todas tus tareas abiertas se movieron en los últimos {data?.stale_days ?? 14} días. 👌</p>}
      {count > 0 && <p>Llevan más de {data?.stale_days} días sin cambios ni comentarios. ¿Siguen vigentes?</p>}
      <ul className={styles.feed}>
        {rows.map((t) => (
          <li key={t.id}>
            <span className={styles.feedDot} style={{ background: t.project ? dotColor(t.project.color) : 'var(--faint)' }} aria-hidden="true" />
            <Link to={`/tareas/${t.id}`} className={styles.feedTitle}>
              {t.title}
            </Link>
            <span className={styles.feedMeta}>
              {timeAgo(t.updated_at)}
              {t.due_at && ` · vence ${formatDue(t.due_at)}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The latest comments others left on my tasks. */
export function CommentsCard({ className }: { className: string }) {
  const { data, isPending } = useInsights()
  const rows = data?.comments ?? []
  return (
    <section className={className}>
      <h2>Comentarios recientes</h2>
      {isPending && <p>Cargando…</p>}
      {!isPending && rows.length === 0 && <p>Nadie ha comentado en tus tareas todavía.</p>}
      <ul className={styles.comments}>
        {rows.map((c) => (
          <li key={c.id}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(c.author?.name ?? '?')}
            </span>
            <div>
              <div className={styles.commentHead}>
                <strong>{c.author?.name ?? 'Alguien'}</strong>
                <span>{timeAgo(c.created_at)}</span>
              </div>
              <Link to={`/tareas/${c.task.id}`} className={styles.commentTask}>
                {c.task.title}
              </Link>
              <p className={styles.commentBody}>{c.excerpt}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
