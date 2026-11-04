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
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Task } from '../api/types'
import { Icon } from '../components/Icon'
import { CompleteCheckbox } from '../components/tasks/TaskRow'
import { ViewFilters } from '../components/views/ViewFilters'
import { ViewHeader } from '../components/views/ViewHeader'
import viewStyles from '../components/views/views.module.css'
import { useTasks, useUpdateTask } from '../hooks/useWorkspaceData'
import { dotColor } from '../lib/colors'
import {
  addDays,
  dayKey,
  daysBetween,
  endOfDay,
  formatTime,
  monthGrid,
  parseDayKey,
  shiftDays,
  startOfDay,
  startOfWeek,
} from '../lib/dates'
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
function anchorOf(task: Task): string | null {
  const iso = task.due_at ?? task.start_at
  return iso ? dayKey(new Date(iso)) : null
}

function sortDayTasks(a: Task, b: Task) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1
  return (a.due_at ?? '').localeCompare(b.due_at ?? '') || a.priority - b.priority
}

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

export function CalendarPage() {
  const [mode, setMode] = useState<Mode>('mes')
  const [today] = useState(() => startOfDay(new Date()))
  const [anchor, setAnchor] = useState(today)
  const [selected, setSelected] = useState(() => dayKey(today))
  const [filters, setFilters] = useState<ViewFilterValues>(NO_FILTERS)
  const updateTask = useUpdateTask()
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const justDragged = useRef(false)

  const days = useMemo(() => {
    if (mode === 'mes') return monthGrid(anchor)
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [mode, anchor])

  const range = { from: days[0].toISOString(), to: endOfDay(days[days.length - 1]).toISOString() }
  const query = useTasks({ ...toTaskFilters(filters), status: 'all', ...range })

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    ;(query.data ?? []).forEach((t) => {
      const key = anchorOf(t)
      if (!key) return
      map.set(key, [...(map.get(key) ?? []), t])
    })
    map.forEach((list) => list.sort(sortDayTasks))
    return map
  }, [query.data])

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
                    mode={mode}
                    isToday={key === dayKey(today)}
                    outside={mode === 'mes' && day.getMonth() !== anchor.getMonth()}
                    selected={key === selected}
                    onSelect={() => setSelected(key)}
                  />
                )
              })}
            </div>
          </section>

          <aside className={styles.agenda} aria-labelledby="agenda-title">
            <div className={styles.agendaHead}>
              <h2 id="agenda-title">{capitalize(dayTitle.format(parseDayKey(selected)))}</h2>
              <Link to={`/tareas/nueva?fecha=${selected}`} className={styles.agendaAdd} aria-label="Nueva tarea este día">
                <Icon name="plus" size={18} />
              </Link>
            </div>
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
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className={viewStyles.note}>
              Las tareas aparecen el día que vencen. Arrastra una a otro día para cambiar su fecha.
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
  mode: Mode
  isToday: boolean
  outside: boolean
  selected: boolean
  onSelect: () => void
}

function DayCell({ day, tasks, mode, isToday, outside, selected, onSelect }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day) })
  const visible = mode === 'mes' ? tasks.slice(0, MAX_IN_CELL) : tasks
  const hidden = tasks.length - visible.length
  const open = tasks.filter((t) => !t.completed).length

  return (
    <div
      ref={setNodeRef}
      className={[styles.cell, outside && styles.outside, selected && styles.selected, isOver && styles.over].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={`${styles.dayBtn} ${isToday ? styles.todayNum : ''}`}
        aria-pressed={selected}
        aria-label={`${capitalize(dayTitle.format(day))}${tasks.length ? `, ${tasks.length} tareas` : ''}`}
        onClick={onSelect}
      >
        {mode === 'semana' && <span className={styles.dow}>{WEEKDAYS[(day.getDay() + 6) % 7]}</span>}
        {day.getDate()}
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} aria-roledescription="tarea movible" className={`${styles.chipWrap} ${isDragging ? styles.dragging : ''}`}>
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
      {clock && <span className={styles.chipTime}>{clock}</span>}
      <span className={styles.chipTitle}>{task.title}</span>
    </>
  )
  if (overlay) return <span className={className}>{content}</span>
  return (
    <Link to={`/tareas/${task.id}`} className={className} draggable={false}>
      {content}
    </Link>
  )
}
