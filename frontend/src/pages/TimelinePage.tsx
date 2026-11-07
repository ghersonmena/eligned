import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ProjectColor, Task } from '../api/types'
import { Icon } from '../components/Icon'
import { ViewFilters } from '../components/views/ViewFilters'
import { ViewHeader } from '../components/views/ViewHeader'
import viewStyles from '../components/views/views.module.css'
import { useTasks, useUpdateTask } from '../hooks/useWorkspaceData'
import { chipStyle, dotColor } from '../lib/colors'
import { addDays, endOfDay, formatDone, startOfDay } from '../lib/dates'
import {
  completionMarks,
  datesAfterDrag,
  datesAfterHourDrag,
  datesFromSubtasks,
  makeAxis,
  pointOf,
  shiftAnchor,
  taskExtent,
  taskProgress,
  taskSpan,
  type Axis,
  type DragMode,
  type Scale,
} from '../lib/timeline'
import { NO_FILTERS, toTaskFilters, type ViewFilterValues } from '../lib/viewFilters'
import pageStyles from './pages.module.css'
import styles from './timeline.module.css'

const SCALE_LABELS: Record<Scale, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' }
const SCALE_KEY = 'cronograma.escala'

function savedScale(): Scale {
  try {
    const v = localStorage.getItem(SCALE_KEY)
    return v === 'dia' || v === 'semana' || v === 'mes' ? v : 'semana'
  } catch {
    return 'semana'
  }
}

const shortDay = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const longDay = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })
const monthName = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
const fullDay = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const weekdayName = new Intl.DateTimeFormat('es', { weekday: 'long' })

interface Group {
  key: string
  name: string
  color: ProjectColor
  tasks: Task[]
}

export function TimelinePage() {
  const [scale, setScaleState] = useState<Scale>(savedScale)
  const [today] = useState(() => startOfDay(new Date()))
  const [anchor, setAnchor] = useState(today)
  const [filters, setFilters] = useState<ViewFilterValues>(NO_FILTERS)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  // Tasks whose subtasks are unfolded.
  const [unfolded, setUnfolded] = useState<Set<number>>(() => new Set())
  // Room for the dates: the chart minus the task names column (narrower on phones).
  const chartRef = useRef<HTMLElement>(null)
  const [available, setAvailable] = useState(0)
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const measure = () => {
      const label = chart.querySelector<HTMLElement>(`.${styles.label}`)?.offsetWidth ?? 260
      setAvailable(Math.max(0, chart.clientWidth - label))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(chart)
    return () => observer.disconnect()
  }, [])
  const axis = useMemo(() => makeAxis(scale, anchor, available), [scale, anchor, available])
  const { start: windowStart, days, dayWidth } = axis
  const windowEnd = addDays(windowStart, days - 1)

  function setScale(next: Scale) {
    setScaleState(next)
    try {
      localStorage.setItem(SCALE_KEY, next)
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  }

  const query = useTasks({
    ...toTaskFilters(filters),
    status: 'all',
    from: windowStart.toISOString(),
    to: endOfDay(windowEnd).toISOString(),
  })

  const groups = useMemo(() => {
    const map = new Map<string, Group>()
    ;(query.data ?? []).forEach((t) => {
      const key = t.project ? String(t.project.id) : 'none'
      if (!map.has(key)) map.set(key, { key, name: t.project?.name ?? 'Sin proyecto', color: t.project?.color ?? 'slate', tasks: [] })
      map.get(key)!.tasks.push(t)
    })
    const list = [...map.values()]
    list.forEach((g) => g.tasks.sort((a, b) => (taskSpan(a)?.start.getTime() ?? 0) - (taskSpan(b)?.start.getTime() ?? 0)))
    return list.sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.name.localeCompare(b.name)))
  }, [query.data])

  const parentIds = useMemo(() => (query.data ?? []).filter((t) => t.subtasks?.length).map((t) => t.id), [query.data])
  const allUnfolded = parentIds.length > 0 && parentIds.every((id) => unfolded.has(id))

  function toggle(id: number) {
    const next = new Set(unfolded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setUnfolded(next)
  }

  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(windowStart, i)), [windowStart, days])
  const months = useMemo(() => {
    const out: { label: string; span: number }[] = []
    dayList.forEach((d) => {
      const label = monthName.format(d)
      if (out.at(-1)?.label === label) out.at(-1)!.span++
      else out.push({ label, span: 1 })
    })
    return out
  }, [dayList])

  const laneWidth = axis.width
  // Width of a grid column: an hour, a day or a week.
  const columnWidth = scale === 'dia' ? dayWidth / 24 : scale === 'semana' ? dayWidth : dayWidth * 7
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const todayX = now >= windowStart && now < addDays(windowEnd, 1) ? pointOf(axis, now) : null

  // Día opens around the current hour.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.scrollLeft = scale === 'dia' && todayX !== null ? Math.max(0, todayX - columnWidth * 2) : 0
    // Only when the window changes, not every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, anchor])
  const gridBg = {
    width: laneWidth,
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${columnWidth - 1}px, var(--border) 0 ${columnWidth}px)`,
  }

  const eyebrow =
    scale === 'dia'
      ? fullDay.format(windowStart)
      : scale === 'semana'
        ? `${shortDay.format(windowStart)} – ${shortDay.format(windowEnd)} ${windowEnd.getFullYear()}`
        : monthName.format(anchor)
  const stepLabel = scale === 'dia' ? 'día' : scale === 'semana' ? 'semana' : 'mes'

  return (
    <>
      <ViewHeader
        eyebrow={eyebrow}
        title="Cronograma"
        aside={
          <div className={viewStyles.navGroup}>
            <button type="button" className={viewStyles.roundBtn} aria-label={`${stepLabel[0].toUpperCase()}${stepLabel.slice(1)} anterior`} onClick={() => setAnchor(shiftAnchor(scale, anchor, -1))}>
              <Icon name="back" size={16} />
            </button>
            <button type="button" className={viewStyles.todayBtn} onClick={() => setAnchor(today)}>
              Hoy
            </button>
            <button type="button" className={viewStyles.roundBtn} aria-label={`${stepLabel[0].toUpperCase()}${stepLabel.slice(1)} siguiente`} onClick={() => setAnchor(shiftAnchor(scale, anchor, 1))}>
              <Icon name="forward" size={16} />
            </button>
            {parentIds.length > 0 && (
              <button
                type="button"
                className={viewStyles.todayBtn}
                aria-pressed={allUnfolded}
                onClick={() => setUnfolded(allUnfolded ? new Set() : new Set(parentIds))}
              >
                {allUnfolded ? 'Ocultar subtareas' : 'Ver subtareas'}
              </button>
            )}
            <div className={viewStyles.scale} role="group" aria-label="Escala">
              {(Object.keys(SCALE_LABELS) as Scale[]).map((s) => (
                <button key={s} type="button" aria-pressed={scale === s} onClick={() => setScale(s)}>
                  {SCALE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        }
        filters={<ViewFilters value={filters} onChange={setFilters} />}
      />

      {query.isError && (
        <p className={pageStyles.error} role="alert">
          No pudimos cargar el cronograma. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}

      <section ref={chartRef} className={styles.chart} aria-label="Cronograma de tareas">
        <div className={styles.inner} style={{ minWidth: laneWidth }}>
          <div className={`${styles.row} ${styles.headRow}`}>
            <div className={`${styles.label} ${styles.headLabel}`}>Tarea</div>
            <div className={styles.lane} style={{ width: laneWidth }}>
              <div className={styles.months}>
                {scale === 'dia' ? (
                  <span style={{ width: laneWidth }}>{fullDay.format(windowStart)}</span>
                ) : (
                  months.map((m, i) => (
                    <span key={i} style={{ width: m.span * dayWidth }}>
                      {m.span * dayWidth >= 70 ? m.label : ''}
                    </span>
                  ))
                )}
              </div>
              <div className={styles.days}>
                {scale === 'dia' &&
                  Array.from({ length: 24 }, (_, h) => (
                    <span
                      key={h}
                      style={{ width: columnWidth }}
                      className={todayX !== null && now.getHours() === h ? styles.isToday : undefined}
                    >
                      <small>{h < 12 ? 'a.m.' : 'p.m.'}</small>
                      {String(h).padStart(2, '0')}:00
                    </span>
                  ))}
                {scale === 'semana' &&
                  dayList.map((d, i) => (
                    <span
                      key={i}
                      style={{ width: dayWidth }}
                      className={[d.getTime() === today.getTime() && styles.isToday, (d.getDay() === 0 || d.getDay() === 6) && styles.weekend]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <small>{weekdayName.format(d)}</small>
                      {d.getDate()}
                    </span>
                  ))}
                {scale === 'mes' &&
                  dayList
                    .filter((_, i) => i % 7 === 0)
                    .map((d, i) => {
                      const end = addDays(d, 6)
                      const current = today >= d && today <= end
                      return (
                        <span key={i} style={{ width: columnWidth }} className={current ? styles.isToday : undefined}>
                          <small>
                            {shortDay.format(d)} – {shortDay.format(end)}
                          </small>
                          Semana {i + 1}
                        </span>
                      )
                    })}
              </div>
            </div>
          </div>

          {groups.map((g) => {
            const open = !closed[g.key]
            const extents = g.tasks.map((t) => taskExtent(t, axis)).filter((e): e is NonNullable<typeof e> => !!e)
            const gLeft = Math.max(0, Math.min(...extents.map((e) => e.left)))
            const gRight = Math.min(laneWidth, Math.max(...extents.map((e) => e.right)))
            const pct = Math.round(g.tasks.reduce((sum, t) => sum + taskProgress(t), 0) / g.tasks.length)
            return (
              <div key={g.key} role="group" aria-label={g.name}>
                <div className={styles.row}>
                  <button
                    type="button"
                    className={`${styles.label} ${styles.groupLabel}`}
                    aria-expanded={open}
                    onClick={() => setClosed({ ...closed, [g.key]: open })}
                  >
                    <span className={open ? styles.chev : `${styles.chev} ${styles.chevClosed}`}>
                      <Icon name="chevronDown" size={14} />
                    </span>
                    <span className={styles.badge} style={chipStyle(g.color)} aria-hidden="true">
                      {g.name.charAt(0).toUpperCase()}
                    </span>
                    <span className={styles.groupName}>{g.name}</span>
                    <span className={styles.pct}>{pct}%</span>
                  </button>
                  <div className={styles.lane} style={gridBg}>
                    <span
                      className={styles.groupBar}
                      style={{
                        left: gLeft,
                        width: Math.max(gRight - gLeft, 4),
                        background: dotColor(g.color),
                      }}
                      aria-hidden="true"
                    />
                    <TodayLine x={todayX} />
                  </div>
                </div>
                {open &&
                  g.tasks.map((t) => {
                    const subtasks = t.subtasks ?? []
                    const isOpen = unfolded.has(t.id)
                    return (
                      <div key={t.id} role="group" aria-label={t.title}>
                        <div className={styles.row}>
                          <div className={`${styles.label} ${styles.taskLabel}`}>
                            {subtasks.length > 0 ? (
                              <button
                                type="button"
                                className={styles.fold}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Ocultar' : 'Ver'} las ${subtasks.length} subtareas de "${t.title}"`}
                                onClick={() => toggle(t.id)}
                              >
                                <span className={isOpen ? styles.chev : `${styles.chev} ${styles.chevClosed}`}>
                                  <Icon name="chevronDown" size={14} />
                                </span>
                                <span className={styles.foldCount}>{subtasks.length}</span>
                              </button>
                            ) : (
                              <span className={styles.foldSpacer} aria-hidden="true" />
                            )}
                            <Link to={`/tareas/${t.id}`} className={`${styles.taskName} ${t.completed ? styles.done : ''}`}>
                              {t.title}
                            </Link>
                          </div>
                          <div className={styles.lane} style={gridBg}>
                            <TodayLine x={todayX} />
                            <Bar task={t} color={g.color} axis={axis} />
                            <Completion task={t} axis={axis} />
                          </div>
                        </div>
                        {isOpen &&
                          subtasks.map((st) => (
                            <div key={st.id} className={`${styles.row} ${styles.subRow}`}>
                              <div className={`${styles.label} ${styles.subLabel}`}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M6 4v9a3 3 0 0 0 3 3h10M15 12l4 4-4 4" />
                                </svg>
                                <Link to={`/tareas/${st.id}`} className={`${styles.taskName} ${st.completed ? styles.done : ''}`}>
                                  {st.title}
                                </Link>
                              </div>
                              <div className={styles.lane} style={gridBg}>
                                <TodayLine x={todayX} />
                                {taskSpan(st) ? (
                                  <>
                                    <Bar task={st} color={g.color} axis={axis} />
                                    <Completion task={st} axis={axis} />
                                  </>
                                ) : (
                                  <span className={styles.noDates}>Sin fechas</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )
                  })}
              </div>
            )
          })}

          {query.isSuccess && groups.length === 0 && (
            <p className={styles.empty}>No hay tareas con fechas en estas semanas.</p>
          )}
        </div>
      </section>

      <div className={styles.legend}>
        <span>
          <span className={styles.legendBar} /> Inicio → fecha límite
        </span>
        <span>
          <span className={styles.legendDiamond} /> Solo fecha límite
        </span>
        <span>
          <span className={styles.legendToday} /> Hoy
        </span>
        <span>
          <span className={styles.legendSummary} /> Tarea con subtareas: va de la primera a la última subtarea
        </span>
        <span>
          <span className={`${styles.legendMark} ${styles.dueMarkColor}`} /> Fecha límite de una tarea terminada
        </span>
        <span>
          <span className={`${styles.legendMark} ${styles.doneMarkColor}`} /> Terminada a tiempo
          <span className={`${styles.legendLine} ${styles.linkEarly}`} />
        </span>
        <span>
          <span className={`${styles.legendMark} ${styles.doneLateColor}`} /> Terminada con retraso
          <span className={`${styles.legendLine} ${styles.linkLate}`} />
        </span>
        <span>Arrastra una barra para moverla o sus bordes para cambiar las fechas. Las tareas sin fechas no aparecen aquí.</span>
        <span id="timeline-keys">
          Con teclado: flechas mueven la tarea {scale === 'dia' ? 'una hora' : 'un día'}; Mayús + flechas cambian la fecha límite; Alt + flechas
          cambian el inicio.
        </span>
      </div>
    </>
  )
}

/** Completed task: diamond of its due date, diamond of when it was finished, and the line between them. */
function Completion({ task, axis }: { task: Task; axis: Axis }) {
  const marks = completionMarks(task, axis)
  if (!marks) return null
  const { dueX, doneX, late } = marks
  return (
    <>
      {dueX !== null && (
        <>
          <span
            className={`${styles.link} ${late ? styles.linkLate : styles.linkEarly}`}
            style={{ left: Math.min(dueX, doneX), width: Math.abs(doneX - dueX) }}
            aria-hidden="true"
          />
          <span className={`${styles.mark} ${styles.dueMarkColor}`} style={{ left: dueX }} aria-hidden="true" />
        </>
      )}
      <span className={`${styles.mark} ${late ? styles.doneLateColor : styles.doneMarkColor}`} style={{ left: doneX }} aria-hidden="true" />
    </>
  )
}

function TodayLine({ x }: { x: number | null }) {
  if (x === null) return null
  return <span className={styles.todayLine} style={{ left: x - 1 }} aria-hidden="true" />
}

interface DragState {
  mode: DragMode
  x0: number
  delta: number
}

interface BarProps {
  task: Task
  /** Project color (subtasks inside a parent don't carry their project). */
  color: ProjectColor
  axis: Axis
}

/**
 * A task bar (or a diamond when it only has a due date) that can be dragged and
 * resized. A task with dated subtasks gets a summary bar that follows them.
 */
function Bar({ task, color, axis }: BarProps) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()
  const [drag, setDrag] = useState<DragState | null>(null)
  const moved = useRef(false)
  const pressX = useRef(0)
  const span = taskSpan(task)
  const extent = taskExtent(task, axis)
  if (!span || !extent) return null

  const summary = datesFromSubtasks(task)
  const isMarker = !task.start_at && !summary
  const unit = axis.stepWidth
  const shift = (drag?.delta ?? 0) * unit
  const shownLeft = extent.left + (drag?.mode === 'move' || drag?.mode === 'start' ? shift : 0)
  const shownRight = extent.right + (drag?.mode === 'move' || drag?.mode === 'end' ? shift : 0)
  // Diamond: its exact time on Día, the middle of its day otherwise.
  const markerX = (task.due_at ? pointOf(axis, new Date(task.due_at)) : extent.left) + (drag?.mode === 'move' ? shift : 0)
  const pct = taskProgress(task)

  function save(mode: DragMode, delta: number) {
    const input = axis.exact ? datesAfterHourDrag(task, mode, delta) : datesAfterDrag(task, mode, delta)
    if (input) updateTask.mutate({ id: task.id, input })
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    moved.current = false
    pressX.current = e.clientX
    if (summary) return
    const handle = (e.target as HTMLElement).dataset.handle as DragMode | undefined
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ mode: handle ?? 'move', x0: e.clientX, delta: 0 })
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (summary && e.buttons === 1 && Math.abs(e.clientX - pressX.current) > 4) moved.current = true
    if (!drag) return
    const delta = Math.round((e.clientX - drag.x0) / unit)
    if (Math.abs(e.clientX - drag.x0) > 4) moved.current = true
    if (delta !== drag.delta) setDrag({ ...drag, delta })
  }

  function onPointerUp() {
    if (!drag) return
    save(drag.mode, drag.delta)
    setDrag(null)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (summary || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    save(e.shiftKey ? 'end' : e.altKey ? 'start' : 'move', e.key === 'ArrowLeft' ? -1 : 1)
  }

  const finished = task.completed_at
    ? `. Terminada ${formatDone(task.completed_at)}${task.due_at ? (new Date(task.completed_at) > new Date(task.due_at) ? ', con retraso' : ', a tiempo') : ''}`
    : ''
  const label = `${task.parent_id ? 'Subtarea ' : ''}${task.title}: ${task.start_at ? `del ${longDay.format(span.start)} al ` : 'vence el '}${longDay.format(span.end)}, ${pct}% de avance${summary ? '. Sus fechas siguen a sus subtareas' : ''}${finished}`
  const width = Math.max(shownRight - shownLeft, axis.exact ? 12 : axis.dayWidth)

  return (
    <button
      type="button"
      className={[
        isMarker ? styles.marker : styles.bar,
        summary && styles.barSummary,
        drag && styles.barDragging,
        task.completed && styles.barDone,
        // Its due-date diamond is drawn by <Completion>; this one stays only to be clicked.
        isMarker && task.completed_at && styles.markerGhost,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        isMarker
          ? { left: markerX - 11, borderColor: dotColor(color) }
          : { left: shownLeft + 2, width: width - 4, ...chipStyle(color) }
      }
      aria-label={label}
      aria-describedby={summary ? undefined : 'timeline-keys'}
      title={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={onKeyDown}
      onClick={() => {
        if (!moved.current) navigate(`/tareas/${task.id}`)
      }}
    >
      {!isMarker && (
        <>
          <span className={styles.fill} style={{ width: `${pct}%`, background: dotColor(color) }} aria-hidden="true" />
          {!summary && <span data-handle="start" className={`${styles.handle} ${styles.handleStart}`} aria-hidden="true" />}
          {width >= 70 && <span className={styles.barText}>{pct}%</span>}
          {!summary && <span data-handle="end" className={`${styles.handle} ${styles.handleEnd}`} aria-hidden="true" />}
        </>
      )}
    </button>
  )
}
