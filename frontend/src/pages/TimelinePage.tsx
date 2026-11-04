import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ProjectColor, Task } from '../api/types'
import { Icon } from '../components/Icon'
import { ViewFilters } from '../components/views/ViewFilters'
import { ViewHeader } from '../components/views/ViewHeader'
import viewStyles from '../components/views/views.module.css'
import { useTasks, useUpdateTask } from '../hooks/useWorkspaceData'
import { chipStyle, dotColor } from '../lib/colors'
import { addDays, daysBetween, endOfDay, startOfDay, startOfWeek } from '../lib/dates'
import { datesAfterDrag, taskProgress, taskSpan, type DragMode } from '../lib/timeline'
import { NO_FILTERS, toTaskFilters, type ViewFilterValues } from '../lib/viewFilters'
import pageStyles from './pages.module.css'
import styles from './timeline.module.css'

type Scale = 'dia' | 'semana'
const SCALES: Record<Scale, { label: string; dayWidth: number; days: number; step: number }> = {
  dia: { label: 'Día', dayWidth: 44, days: 35, step: 7 },
  semana: { label: 'Semana', dayWidth: 14, days: 7 * 16, step: 28 },
}

const shortDay = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const longDay = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })
const monthName = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

interface Group {
  key: string
  name: string
  color: ProjectColor
  tasks: Task[]
}

export function TimelinePage() {
  const [scale, setScale] = useState<Scale>('dia')
  const [today] = useState(() => startOfDay(new Date()))
  const [windowStart, setWindowStart] = useState(() => addDays(startOfWeek(today), -7))
  const [filters, setFilters] = useState<ViewFilterValues>(NO_FILTERS)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const { dayWidth, days, step } = SCALES[scale]
  const windowEnd = addDays(windowStart, days - 1)

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

  const laneWidth = days * dayWidth
  const todayOffset = daysBetween(windowStart, today)
  const chartRef = useRef<HTMLElement>(null)

  // Opens with today in view (a couple of days of context on its left).
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const offset = daysBetween(windowStart, today)
    chart.scrollLeft = offset >= 0 && offset < days ? Math.max(0, (offset - 2) * dayWidth) : 0
  }, [windowStart, today, days, dayWidth])
  const gridBg = {
    width: laneWidth,
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${(scale === 'dia' ? dayWidth : dayWidth * 7) - 1}px, var(--border) 0 ${scale === 'dia' ? dayWidth : dayWidth * 7}px)`,
  }

  return (
    <>
      <ViewHeader
        eyebrow={`${shortDay.format(windowStart)} – ${shortDay.format(windowEnd)} ${windowEnd.getFullYear()}`}
        title="Cronograma"
        aside={
          <div className={viewStyles.navGroup}>
            <button type="button" className={viewStyles.roundBtn} aria-label="Anterior" onClick={() => setWindowStart(addDays(windowStart, -step))}>
              <Icon name="back" size={16} />
            </button>
            <button type="button" className={viewStyles.todayBtn} onClick={() => setWindowStart(addDays(startOfWeek(today), -7))}>
              Hoy
            </button>
            <button type="button" className={viewStyles.roundBtn} aria-label="Siguiente" onClick={() => setWindowStart(addDays(windowStart, step))}>
              <Icon name="forward" size={16} />
            </button>
            <div className={viewStyles.scale} role="group" aria-label="Escala">
              {(Object.keys(SCALES) as Scale[]).map((s) => (
                <button key={s} type="button" aria-pressed={scale === s} onClick={() => setScale(s)}>
                  {SCALES[s].label}
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
                {months.map((m, i) => (
                  <span key={i} style={{ width: m.span * dayWidth }}>
                    {m.span * dayWidth >= 70 ? m.label : ''}
                  </span>
                ))}
              </div>
              <div className={styles.days}>
                {scale === 'dia'
                  ? dayList.map((d, i) => (
                      <span
                        key={i}
                        style={{ width: dayWidth }}
                        className={[i === todayOffset && styles.isToday, (d.getDay() === 0 || d.getDay() === 6) && styles.weekend].filter(Boolean).join(' ')}
                      >
                        <small>{DOW[d.getDay()]}</small>
                        {d.getDate()}
                      </span>
                    ))
                  : dayList
                      .filter((_, i) => i % 7 === 0)
                      .map((d, i) => (
                        <span key={i} style={{ width: dayWidth * 7 }}>
                          {shortDay.format(d)}
                        </span>
                      ))}
              </div>
            </div>
          </div>

          {groups.map((g) => {
            const open = !closed[g.key]
            const spans = g.tasks.map(taskSpan).filter((s): s is NonNullable<typeof s> => !!s)
            const gStart = Math.min(...spans.map((s) => daysBetween(windowStart, s.start)))
            const gEnd = Math.max(...spans.map((s) => daysBetween(windowStart, s.end)))
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
                        left: Math.max(gStart, 0) * dayWidth,
                        width: Math.max((Math.min(gEnd, days - 1) - Math.max(gStart, 0) + 1) * dayWidth, 4),
                        background: dotColor(g.color),
                      }}
                      aria-hidden="true"
                    />
                    <TodayLine offset={todayOffset} dayWidth={dayWidth} days={days} />
                  </div>
                </div>
                {open &&
                  g.tasks.map((t) => (
                    <div key={t.id} className={styles.row}>
                      <Link to={`/tareas/${t.id}`} className={`${styles.label} ${styles.taskLabel} ${t.completed ? styles.done : ''}`}>
                        {t.title}
                      </Link>
                      <div className={styles.lane} style={gridBg}>
                        <TodayLine offset={todayOffset} dayWidth={dayWidth} days={days} />
                        <Bar task={t} windowStart={windowStart} dayWidth={dayWidth} />
                      </div>
                    </div>
                  ))}
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
        <span>Arrastra una barra para moverla o sus bordes para cambiar las fechas. Las tareas sin fechas no aparecen aquí.</span>
        <span id="timeline-keys">
          Con teclado: flechas mueven la tarea un día; Mayús + flechas cambian la fecha límite; Alt + flechas cambian el inicio.
        </span>
      </div>
    </>
  )
}

function TodayLine({ offset, dayWidth, days }: { offset: number; dayWidth: number; days: number }) {
  if (offset < 0 || offset >= days) return null
  return <span className={styles.todayLine} style={{ left: offset * dayWidth + dayWidth / 2 }} aria-hidden="true" />
}

interface DragState {
  mode: DragMode
  x0: number
  delta: number
}

/** A task bar (or a diamond when it only has a due date) that can be dragged and resized. */
function Bar({ task, windowStart, dayWidth }: { task: Task; windowStart: Date; dayWidth: number }) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()
  const [drag, setDrag] = useState<DragState | null>(null)
  const moved = useRef(false)
  const span = taskSpan(task)
  if (!span) return null

  const isMarker = !task.start_at
  const startOffset = daysBetween(windowStart, span.start)
  const length = daysBetween(span.start, span.end) + 1
  const d = drag?.delta ?? 0
  const shownStart = startOffset + (drag?.mode === 'move' || drag?.mode === 'start' ? d : 0)
  const shownLength = length + (drag?.mode === 'end' ? d : drag?.mode === 'start' ? -d : 0)
  const pct = taskProgress(task)
  const color = task.project?.color ?? 'slate'

  function save(mode: DragMode, delta: number) {
    const input = datesAfterDrag(task, mode, delta)
    if (input) updateTask.mutate({ id: task.id, input })
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    const handle = (e.target as HTMLElement).dataset.handle as DragMode | undefined
    e.currentTarget.setPointerCapture(e.pointerId)
    moved.current = false
    setDrag({ mode: handle ?? 'move', x0: e.clientX, delta: 0 })
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return
    const delta = Math.round((e.clientX - drag.x0) / dayWidth)
    if (Math.abs(e.clientX - drag.x0) > 4) moved.current = true
    if (delta !== drag.delta) setDrag({ ...drag, delta })
  }

  function onPointerUp() {
    if (!drag) return
    save(drag.mode, drag.delta)
    setDrag(null)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    save(e.shiftKey ? 'end' : e.altKey ? 'start' : 'move', e.key === 'ArrowLeft' ? -1 : 1)
  }

  const label = `${task.title}: ${task.start_at ? `del ${longDay.format(span.start)} al ` : 'vence el '}${longDay.format(span.end)}, ${pct}% de avance`
  const width = Math.max(shownLength, 1) * dayWidth

  return (
    <button
      type="button"
      className={`${isMarker ? styles.marker : styles.bar} ${drag ? styles.barDragging : ''} ${task.completed ? styles.barDone : ''}`}
      style={
        isMarker
          ? { left: shownStart * dayWidth + dayWidth / 2 - 11, borderColor: dotColor(color) }
          : { left: shownStart * dayWidth + 2, width: width - 4, ...chipStyle(color) }
      }
      aria-label={label}
      aria-describedby="timeline-keys"
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
          <span data-handle="start" className={`${styles.handle} ${styles.handleStart}`} aria-hidden="true" />
          {width >= 70 && <span className={styles.barText}>{pct}%</span>}
          <span data-handle="end" className={`${styles.handle} ${styles.handleEnd}`} aria-hidden="true" />
        </>
      )}
    </button>
  )
}
