import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { Task } from '../api/types'
import { Icon } from '../components/Icon'
import { DoneStamp } from '../components/tasks/DoneStamp'
import { CompleteCheckbox } from '../components/tasks/TaskRow'
import { ViewFilters } from '../components/views/ViewFilters'
import { ViewHeader } from '../components/views/ViewHeader'
import viewStyles from '../components/views/views.module.css'
import { useMe } from '../hooks/useAuth'
import { useCreateTask, useTasks, useUpdateTask } from '../hooks/useWorkspaceData'
import { dotColor } from '../lib/colors'
import {
  addDays,
  dayKey,
  daysBetween,
  dueAtEndOf,
  endOfDay,
  formatTime,
  monthGrid,
  parseDayKey,
  shiftDays,
  sortDayTasks,
  startOfDay,
  startOfWeek,
  taskDayKey,
} from '../lib/dates'
import { datesFromSubtasks, projectSpans, type ProjectSpan } from '../lib/timeline'
import { NO_FILTERS, toTaskFilters, type ViewFilterValues } from '../lib/viewFilters'
import styles from './calendar.module.css'
import pageStyles from './pages.module.css'

type Mode = 'mes' | 'semana'

const monthTitle = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
const dayTitle = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDay = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_IN_CELL = 3

/** The day a task shows on: its due day, or its start day when it has no due date. */
/** New dates when a task is dropped on another day (the span keeps its length). */
function datesForDrop(task: Task, day: Date): { start_at?: string | null; due_at?: string | null } | null {
  const anchor = task.due_at ?? task.start_at
  if (!anchor) return null
  const delta = daysBetween(new Date(anchor), day)
  if (delta === 0) return null
  return {
    ...(task.due_at ? { due_at: shiftDays(task.due_at, delta) } : {}),
    ...(task.start_at ? { start_at: shiftDays(task.start_at, delta) } : {}),
  }
}

/** A project covering a day, and whether its span begins/ends there. */
interface DayProject {
  span: ProjectSpan
  slot: number
  first: boolean
  last: boolean
}

/** Soft cell background in the colors of the projects covering it (side by side when several). */
function shading(projects: DayProject[]): CSSProperties | undefined {
  if (!projects.length) return undefined
  const tint = (p: DayProject) => `color-mix(in srgb, var(--c-${p.span.color}-bg) 75%, var(--row))`
  if (projects.length === 1) return { background: tint(projects[0]) }
  const share = 100 / projects.length
  const stops = projects.map((p, i) => `${tint(p)} ${i * share}% ${(i + 1) * share}%`)
  return { background: `linear-gradient(90deg, ${stops.join(', ')})` }
}

export function CalendarPage() {
  const [mode, setMode] = useState<Mode>('mes')
  const [today] = useState(() => startOfDay(new Date()))
  const [anchor, setAnchor] = useState(today)
  const [selected, setSelected] = useState(() => dayKey(today))
  const [filters, setFilters] = useState<ViewFilterValues>(NO_FILTERS)
  const [shade, setShade] = useState(true)
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const { data: user } = useMe()
  const [quickTitle, setQuickTitle] = useState('')
  const [added, setAdded] = useState('')
  const quickRef = useRef<HTMLInputElement>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const justDragged = useRef(false)

  const days = useMemo(() => {
    if (mode === 'mes') return monthGrid(anchor)
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [mode, anchor])

  const range = { from: days[0].toISOString(), to: endOfDay(days[days.length - 1]).toISOString() }
  const query = useTasks({ ...toTaskFilters(filters), status: 'all', with_subtasks: 1, ...range })

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    ;(query.data ?? []).forEach((t) => {
      const key = taskDayKey(t)
      if (!key) return
      map.set(key, [...(map.get(key) ?? []), t])
    })
    map.forEach((list) => list.sort(sortDayTasks))
    return map
  }, [query.data])

  // Projects shown in this month/week, each one in a fixed band slot so it reads as a continuous line.
  const spans = useMemo(() => {
    const first = days[0]
    const last = days[days.length - 1]
    return projectSpans(query.data ?? []).filter((s) => s.end >= first && s.start <= last)
  }, [query.data, days])

  function projectsOn(day: Date): DayProject[] {
    if (!shade) return []
    return spans.flatMap((span, slot) =>
      day >= span.start && day <= span.end
        ? [{ span, slot, first: daysBetween(span.start, day) === 0, last: daysBetween(day, span.end) === 0 }]
        : [],
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function step(direction: -1 | 1) {
    const next = new Date(anchor)
    if (mode === 'mes') next.setMonth(next.getMonth() + direction, 1)
    else next.setDate(next.getDate() + 7 * direction)
    setAnchor(next)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null)
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 0)
    if (!over) return
    const task = (query.data ?? []).find((t) => t.id === Number(active.id))
    const day = parseDayKey(String(over.id))
    const input = task && datesForDrop(task, day)
    if (task && input) {
      updateTask.mutate({ id: task.id, input })
      setSelected(String(over.id))
    }
  }

  /** Selects a day and puts the cursor in "new task for this day". */
  function addOn(key: string) {
    setSelected(key)
    const input = quickRef.current
    if (!input) return
    input.scrollIntoView({ block: 'center', behavior: 'smooth' })
    input.focus({ preventScroll: true })
  }

  function addQuick(e: FormEvent) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title || createTask.isPending) return
    const day = parseDayKey(selected)
    createTask.mutate(
      {
        title,
        due_at: dueAtEndOf(day),
        // Keeps the new task visible with the current filters.
        ...(filters.projectId ? { project_id: Number(filters.projectId) } : {}),
        ...(filters.mine && user ? { assignee_ids: [user.id] } : {}),
      },
      {
        onSuccess: () => {
          setQuickTitle('')
          setAdded(`"${title}" agregada al ${dayTitle.format(day)}.`)
        },
      },
    )
  }

  const title =
    mode === 'mes'
      ? monthTitle.format(anchor)
      : `${shortDay.format(days[0])} – ${shortDay.format(days[6])} ${days[6].getFullYear()}`
  const selectedTasks = byDay.get(selected) ?? []
  const draggingTask = draggingId !== null ? (query.data ?? []).find((t) => t.id === draggingId) : undefined

  return (
    <>
      <ViewHeader
        eyebrow={mode === 'mes' ? 'Mes' : 'Semana'}
        title={title.charAt(0).toUpperCase() + title.slice(1)}
        newTaskHref={`/tareas/nueva?fecha=${selected}`}
        aside={
          <div className={viewStyles.navGroup}>
            <button type="button" className={viewStyles.roundBtn} aria-label={mode === 'mes' ? 'Mes anterior' : 'Semana anterior'} onClick={() => step(-1)}>
              <Icon name="back" size={16} />
            </button>
            <button
              type="button"
              className={viewStyles.todayBtn}
              onClick={() => {
                setAnchor(today)
                setSelected(dayKey(today))
              }}
            >
              Hoy
            </button>
            <button type="button" className={viewStyles.roundBtn} aria-label={mode === 'mes' ? 'Mes siguiente' : 'Semana siguiente'} onClick={() => step(1)}>
              <Icon name="forward" size={16} />
            </button>
            <div className={viewStyles.scale} role="group" aria-label="Escala">
              {(['mes', 'semana'] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m === 'mes' ? 'Mes' : 'Semana'}
                </button>
              ))}
            </div>
          </div>
        }
        filters={<ViewFilters value={filters} onChange={setFilters} />}
      />

      {query.isError && (
        <p className={pageStyles.error} role="alert">
          No pudimos cargar el calendario. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDraggingId(Number(active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDraggingId(null)}
        accessibility={{
          screenReaderInstructions: {
            draggable: 'Para cambiar la fecha pulsa espacio, muévete entre días con las flechas y pulsa espacio para soltar.',
          },
          announcements: {
            onDragStart: () => 'Tarea tomada.',
            onDragOver: ({ over }) => (over ? dayTitle.format(parseDayKey(String(over.id))) : 'Fuera del calendario.'),
            onDragEnd: ({ over }) => (over ? `Movida al ${dayTitle.format(parseDayKey(String(over.id)))}.` : 'Sin cambios.'),
            onDragCancel: () => 'Sin cambios.',
          },
        }}
      >
        <div className={styles.layout}>
          <section
            className={`${styles.calendar} ${mode === 'semana' ? styles.week : ''}`}
            aria-label={title}
            onClickCapture={(e) => {
              if (justDragged.current) e.preventDefault()
            }}
          >
            <div className={styles.weekdays} aria-hidden="true">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className={styles.grid}>
              {days.map((day) => {
                const key = dayKey(day)
                return (
                  <DayCell
                    key={key}
                    day={day}
                    tasks={byDay.get(key) ?? []}
                    projects={projectsOn(day)}
                    slots={shade ? spans.length : 0}
                    mode={mode}
                    isToday={key === dayKey(today)}
                    outside={mode === 'mes' && day.getMonth() !== anchor.getMonth()}
                    selected={key === selected}
                    onSelect={() => (key === selected ? addOn(key) : setSelected(key))}
                    onAdd={() => addOn(key)}
                  />
                )
              })}
            </div>
            {spans.length > 0 && (
              <div className={styles.legend}>
                <label className={styles.shadeToggle}>
                  <input type="checkbox" checked={shade} onChange={(e) => setShade(e.target.checked)} />
                  Sombrear los días de cada proyecto
                </label>
                {shade && (
                  <ul className={styles.legendList} aria-label="Proyectos en estas fechas">
                    {spans.map((s) => (
                      <li key={s.id}>
                        <span className={styles.legendSwatch} style={{ background: dotColor(s.color) }} aria-hidden="true" />
                        {s.name}
                        <span className={styles.legendDates}>
                          {shortDay.format(s.start)} – {shortDay.format(s.end)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <aside className={styles.agenda} aria-labelledby="agenda-title">
            <div className={styles.agendaHead}>
              <h2 id="agenda-title">{capitalize(dayTitle.format(parseDayKey(selected)))}</h2>
              <Link to={`/tareas/nueva?fecha=${selected}`} className={styles.agendaAdd} aria-label="Nueva tarea este día">
                <Icon name="plus" size={18} />
              </Link>
            </div>
            <form className={styles.quickAdd} onSubmit={addQuick}>
              <input
                ref={quickRef}
                className="caps"
                autoCapitalize="characters"
                value={quickTitle}
                maxLength={255}
                placeholder="Nueva tarea para este día"
                aria-label={`Nueva tarea para el ${dayTitle.format(parseDayKey(selected))}`}
                onChange={(e) => {
                  setQuickTitle(e.target.value)
                  setAdded('')
                }}
              />
              <button type="submit" disabled={!quickTitle.trim() || createTask.isPending}>
                {createTask.isPending ? 'Añadiendo…' : 'Añadir'}
              </button>
            </form>
            <p className={styles.quickStatus} role="status">
              {createTask.isError ? 'No se pudo crear la tarea. Inténtalo de nuevo.' : added}
            </p>
            {selectedTasks.length === 0 ? (
              <p className={viewStyles.note}>Nada para este día.</p>
            ) : (
              <ul className={styles.agendaList}>
                {selectedTasks.map((t) => (
                  <li key={t.id} className={`${styles.agendaItem} ${t.completed ? styles.done : ''}`}>
                    <CompleteCheckbox task={t} />
                    <Link to={`/tareas/${t.id}`} className={styles.agendaLink}>
                      <span className={styles.agendaTitle}>{t.title}</span>
                      <span className={styles.agendaMeta}>
                        {t.due_at ? (formatTime(t.due_at) ?? 'Todo el día') : 'Inicia este día'}
                        {t.project && ` · ${t.project.name}`}
                      </span>
                      {t.parent && <span className={styles.agendaParent}>Subtarea de {t.parent.title}</span>}
                      <DoneStamp task={t} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className={viewStyles.note}>
              Toca otra vez un día (o su botón +) para escribir una tarea nueva en él. Las tareas y subtareas aparecen el
              día que vencen. Arrastra una a otro día para cambiar su fecha; una
              tarea con subtareas fechadas se mueve moviendo sus subtareas.
            </p>
          </aside>
        </div>
        <DragOverlay dropAnimation={null}>{draggingTask ? <Chip task={draggingTask} overlay /> : null}</DragOverlay>
      </DndContext>
    </>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface DayCellProps {
  day: Date
  tasks: Task[]
  projects: DayProject[]
  /** Band rows to reserve, so each project keeps its row across the week. */
  slots: number
  mode: Mode
  isToday: boolean
  outside: boolean
  selected: boolean
  onSelect: () => void
  onAdd: () => void
}

function DayCell({ day, tasks, projects, slots, mode, isToday, outside, selected, onSelect, onAdd }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day) })
  const visible = mode === 'mes' ? tasks.slice(0, MAX_IN_CELL) : tasks
  const hidden = tasks.length - visible.length
  const open = tasks.filter((t) => !t.completed).length

  return (
    <div
      ref={setNodeRef}
      className={[styles.cell, outside && styles.outside, selected && styles.selected, isOver && styles.over].filter(Boolean).join(' ')}
      style={shading(projects)}
    >
      {slots > 0 && (
        <div className={styles.bands} aria-hidden="true">
          {Array.from({ length: slots }, (_, slot) => {
            const p = projects.find((x) => x.slot === slot)
            if (!p) return <span key={slot} className={styles.bandEmpty} />
            const weekEnd = day.getDay() === 0
            return (
              <span
                key={slot}
                className={[styles.band, p.first && styles.bandFirst, p.last && styles.bandLast, !p.last && !weekEnd && styles.bandJoin]
                  .filter(Boolean)
                  .join(' ')}
                style={{ background: dotColor(p.span.color) }}
                title={p.span.name}
              />
            )
          })}
        </div>
      )}
      <button
        type="button"
        className={`${styles.dayBtn} ${isToday ? styles.todayNum : ''}`}
        aria-pressed={selected}
        aria-label={`${capitalize(dayTitle.format(day))}${tasks.length ? `, ${tasks.length} tareas` : ''}${
          projects.length ? `, proyecto ${projects.map((p) => p.span.name).join(', ')}` : ''
        }`}
        onClick={onSelect}
      >
        {mode === 'semana' && <span className={styles.dow}>{WEEKDAYS[(day.getDay() + 6) % 7]}</span>}
        {day.getDate()}
      </button>
      <button type="button" className={styles.cellAdd} aria-label={`Nueva tarea el ${dayTitle.format(day)}`} title="Nueva tarea este día" onClick={onAdd}>
        <Icon name="plus" size={16} />
      </button>
      <div className={styles.chips}>
        {visible.map((t) => (
          <DraggableChip key={t.id} task={t} />
        ))}
        {hidden > 0 && (
          <button type="button" className={styles.more} onClick={onSelect}>
            +{hidden} más
          </button>
        )}
      </div>
      {open > 0 && <span className={styles.dots} aria-hidden="true">{'•'.repeat(Math.min(open, 3))}</span>}
    </div>
  )
}

function DraggableChip({ task }: { task: Task }) {
  // A parent with dated subtasks moves with them, not on its own.
  const locked = datesFromSubtasks(task)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: locked })
  return (
    <div
      ref={setNodeRef}
      {...(locked ? {} : { ...attributes, ...listeners, 'aria-roledescription': 'tarea movible' })}
      className={`${styles.chipWrap} ${isDragging ? styles.dragging : ''} ${locked ? styles.locked : ''}`}
    >
      <Chip task={task} />
    </div>
  )
}

function Chip({ task, overlay }: { task: Task; overlay?: boolean }) {
  const clock = task.due_at ? formatTime(task.due_at) : null
  const color = task.project ? dotColor(task.project.color) : 'var(--faint)'
  const className = `${styles.chip} ${task.completed ? styles.done : ''} ${overlay ? styles.overlay : ''}`
  const content = (
    <>
      <span className={styles.chipDot} style={{ background: color }} aria-hidden="true" />
      {task.parent && (
        <svg className={styles.chipSub} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 4v9a3 3 0 0 0 3 3h10M15 12l4 4-4 4" />
        </svg>
      )}
      {clock && <span className={styles.chipTime}>{clock}</span>}
      <span className={styles.chipTitle}>{task.title}</span>
    </>
  )
  const hint = task.parent ? `Subtarea de "${task.parent.title}"` : datesFromSubtasks(task) ? 'Sus fechas siguen a sus subtareas' : undefined
  if (overlay) return <span className={className}>{content}</span>
  return (
    <Link
      to={`/tareas/${task.id}`}
      className={className}
      draggable={false}
      title={hint}
      aria-label={task.parent ? `${task.title}, subtarea de ${task.parent.title}` : undefined}
    >
      {content}
    </Link>
  )
}
