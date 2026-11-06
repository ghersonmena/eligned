import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Task } from '../../api/types'
import { useUpdatePreferences } from '../../hooks/useAuth'
import { useTasks } from '../../hooks/useWorkspaceData'
import { dotColor } from '../../lib/colors'
import { addDays, dayKey, endOfDay, sortDayTasks, startOfWeek, taskDayKey } from '../../lib/dates'
import { upper } from '../../lib/text'
import pageStyles from '../../pages/pages.module.css'
import { TaskRow } from '../tasks/TaskRow'
import taskStyles from '../tasks/tasks.module.css'
import styles from './home.module.css'

export const NOTE_MAX = 5000
const SAVE_AFTER_MS = 800

type SaveState = 'saved' | 'pending' | 'saving' | 'error'

const STATE_TEXT: Record<SaveState, string> = {
  saved: 'Guardado',
  pending: 'Escribiendo…',
  saving: 'Guardando…',
  error: 'No se pudo guardar. Se reintentará al seguir escribiendo.',
}

/** A personal scratchpad on the home page. Saves itself shortly after you stop typing. */
export function NotesCard({ className, initial }: { className: string; initial: string | null }) {
  const update = useUpdatePreferences()
  const [text, setText] = useState(initial ?? '')
  const [state, setState] = useState<SaveState>('saved')
  const saved = useRef(initial ?? '')
  const latest = useRef(text)
  const timer = useRef<number | undefined>(undefined)
  // The mutation's `mutate` is stable; kept in a ref so the unmount flush can use it.
  const mutate = useRef(update.mutate)
  useEffect(() => {
    mutate.current = update.mutate
  }, [update.mutate])

  function save() {
    window.clearTimeout(timer.current)
    const value = upper(latest.current)
    if (value === saved.current) return setState('saved')
    setState('saving')
    mutate.current(
      { home_note: value.trim() ? value : null },
      {
        onSuccess: () => {
          saved.current = value
          setState(upper(latest.current) === value ? 'saved' : 'pending')
        },
        onError: () => setState('error'),
      },
    )
  }

  function change(value: string) {
    setText(value)
    latest.current = value
    setState('pending')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(save, SAVE_AFTER_MS)
  }

  // Leaving the page right after typing still saves it.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      const value = upper(latest.current)
      if (value !== saved.current) mutate.current({ home_note: value.trim() ? value : null })
    },
    [],
  )

  const left = NOTE_MAX - text.length

  return (
    <section className={className}>
      <h2>Notas rápidas</h2>
      <textarea
        className={`caps ${styles.noteArea}`}
        autoCapitalize="characters"
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={save}
        maxLength={NOTE_MAX}
        placeholder="Números de folio, pendientes sueltos, recordatorios… Solo tú lo ves."
        aria-label="Notas rápidas"
        aria-describedby="note-status"
      />
      <p id="note-status" className={`${styles.noteStatus} ${state === 'error' ? styles.noteError : ''}`} role="status">
        {STATE_TEXT[state]}
        {left < 500 && ` · quedan ${left} caracteres`}
      </p>
    </section>
  )
}

const weekdayShort = new Intl.DateTimeFormat('es', { weekday: 'short' })
const dayTitle = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })
const rangeFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

/** This week as a strip of days; pick one to see what is due that day. */
export function AgendaCard({ className }: { className: string }) {
  const [today] = useState(() => new Date())
  const todayKey = dayKey(today)
  const [offset, setOffset] = useState(0)
  const [picked, setPicked] = useState(todayKey)

  const days = useMemo(() => {
    const start = addDays(startOfWeek(today), offset * 7)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [today, offset])
  const keys = days.map(dayKey)
  // Moving to another week selects its Monday (or today, back on this week).
  const selected = keys.includes(picked) ? picked : keys.includes(todayKey) ? todayKey : keys[0]

  const { data: tasks = [], isPending } = useTasks({
    status: 'all',
    with_subtasks: 1,
    from: days[0].toISOString(),
    to: endOfDay(days[6]).toISOString(),
  })

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const key = taskDayKey(t)
      if (key) map.set(key, [...(map.get(key) ?? []), t])
    }
    map.forEach((list) => list.sort(sortDayTasks))
    return map
  }, [tasks])

  const list = byDay.get(selected) ?? []
  const selectedDate = days[keys.indexOf(selected)]

  return (
    <section className={`${className} ${pageStyles.cardToday}`}>
      <div className={styles.agendaHead}>
        <h2>Agenda</h2>
        <span className={styles.agendaRange}>
          {rangeFmt.format(days[0])} – {rangeFmt.format(days[6])}
        </span>
        <div className={styles.agendaNav}>
          <button type="button" aria-label="Semana anterior" onClick={() => setOffset(offset - 1)}>
            ‹
          </button>
          {offset !== 0 && (
            <button
              type="button"
              onClick={() => {
                setOffset(0)
                setPicked(todayKey)
              }}
            >
              Hoy
            </button>
          )}
          <button type="button" aria-label="Semana siguiente" onClick={() => setOffset(offset + 1)}>
            ›
          </button>
        </div>
      </div>

      <div className={styles.week} role="group" aria-label="Días de la semana">
        {days.map((d, i) => {
          const key = keys[i]
          const dayTasks = byDay.get(key) ?? []
          const open = dayTasks.filter((t) => !t.completed).length
          return (
            <button
              key={key}
              type="button"
              aria-pressed={key === selected}
              aria-label={`${dayTitle.format(d)}: ${open} ${open === 1 ? 'pendiente' : 'pendientes'}, ${dayTasks.length - open} ${dayTasks.length - open === 1 ? 'terminada' : 'terminadas'}`}
              className={[styles.weekDay, key === todayKey && styles.weekToday].filter(Boolean).join(' ')}
              onClick={() => setPicked(key)}
            >
              <small>{weekdayShort.format(d).replace('.', '')}</small>
              <strong>{d.getDate()}</strong>
              <span className={styles.weekDots} aria-hidden="true">
                {dayTasks.slice(0, 4).map((t) => (
                  <i key={t.id} className={t.completed ? styles.dotDone : undefined} style={{ background: t.project ? dotColor(t.project.color) : 'var(--muted)' }} />
                ))}
                {dayTasks.length > 4 && <em>+</em>}
              </span>
            </button>
          )
        })}
      </div>

      <h3 className={styles.agendaDay}>{selectedDate && dayTitle.format(selectedDate)}</h3>
      {isPending && <p>Cargando…</p>}
      {!isPending && list.length === 0 && <p>Nada programado para este día.</p>}
      {list.length > 0 && (
        <div className={pageStyles.cardScroll} tabIndex={0} aria-label="Tareas del día elegido">
          <ul className={taskStyles.list}>
            {list.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}
      <Link to="/calendario" className={styles.more}>
        Abrir calendario
      </Link>
    </section>
  )
}
