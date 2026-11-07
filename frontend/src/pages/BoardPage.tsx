import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Task, TaskStatus } from '../api/types'
import { TaskCard } from '../components/views/TaskCard'
import { ViewFilters } from '../components/views/ViewFilters'
import { ViewHeader } from '../components/views/ViewHeader'
import styles from '../components/views/views.module.css'
import { useMe } from '../hooks/useAuth'
import { useMoveTask, useStatuses, useTasks } from '../hooks/useWorkspaceData'
import { celebrate } from '../lib/celebrate'
import { dotColor } from '../lib/colors'
import { statusName } from '../lib/statuses'
import { addDays, startOfDay } from '../lib/dates'
import { NO_FILTERS, toTaskFilters, type ViewFilterValues } from '../lib/viewFilters'
import pageStyles from './pages.module.css'
import { t, tk } from '../lib/i18n'

/** Completed cards stay on the board for this many days. */
const DONE_DAYS = 14

const BOARD_HELP = tk(
  'Para mover la tarjeta pulsa espacio, cámbiala de lugar con las flechas y pulsa espacio otra vez para soltarla. Escape cancela.',
)

type Columns = Record<number, number[]>
const colId = (statusId: number) => `col-${statusId}`

export function BoardPage() {
  const { data: user } = useMe()
  const [filters, setFilters] = useState<ViewFilterValues>(NO_FILTERS)
  const [doneSince] = useState(() => addDays(startOfDay(new Date()), -DONE_DAYS).toISOString())
  const { data: statuses = [] } = useStatuses()
  const board = useTasks({ ...toTaskFilters(filters), status: 'all', sort: 'position', done_since: doneSince, with_subtasks: 1 })
  const moveTask = useMoveTask()

  // A task with subtasks isn't a card of its own: its subtasks are, and it is
  // completed when the last one is (so it can't be marked done on its own here).
  const tasks = useMemo(() => (board.data ?? []).filter((t) => t.parent_id || !t.subtasks?.length), [board.data])
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const serverColumns = useMemo(() => {
    const cols: Columns = Object.fromEntries(statuses.map((s) => [s.id, [] as number[]]))
    tasks.forEach((t) => cols[t.status_id]?.push(t.id))
    return cols
  }, [statuses, tasks])

  // While dragging (and until the server answers) the board shows this local copy.
  const [dragColumns, setDragColumns] = useState<Columns | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const dragOrigin = useRef<{ statusId: number; index: number } | null>(null)
  const moveToken = useRef(0)
  const justDragged = useRef(false)
  const columns = dragColumns ?? serverColumns

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function containerOf(id: UniqueIdentifier, cols: Columns): number | null {
    if (typeof id === 'string' && id.startsWith('col-')) return Number(id.slice(4))
    const found = Object.entries(cols).find(([, ids]) => ids.includes(Number(id)))
    return found ? Number(found[0]) : null
  }

  function commit(taskId: number, status: TaskStatus, index: number, cols: Columns | null) {
    const task = byId.get(taskId)
    const token = ++moveToken.current
    setDragColumns(cols)
    moveTask.mutate(
      { id: taskId, status, index },
      {
        onSettled: () => {
          if (token === moveToken.current) setDragColumns(null)
        },
      },
    )
    if (status.is_done && task && !task.completed) celebrate(user?.preferences.confetti ?? true)
  }

  function onDragStart({ active }: DragStartEvent) {
    const id = Number(active.id)
    const statusId = containerOf(id, columns)
    if (statusId === null) return
    dragOrigin.current = { statusId, index: columns[statusId].indexOf(id) }
    moveToken.current++
    setDragColumns(columns)
    setActiveId(id)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !dragColumns) return
    const from = containerOf(active.id, dragColumns)
    const to = containerOf(over.id, dragColumns)
    if (from === null || to === null || from === to) return
    const id = Number(active.id)
    const target = dragColumns[to]
    const overIndex = target.indexOf(Number(over.id))
    const index = overIndex >= 0 ? overIndex : target.length
    setDragColumns({
      ...dragColumns,
      [from]: dragColumns[from].filter((x) => x !== id),
      [to]: [...target.slice(0, index), id, ...target.slice(index)],
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 0)
    const origin = dragOrigin.current
    dragOrigin.current = null
    if (!over || !dragColumns || !origin) {
      setDragColumns(null)
      return
    }
    const id = Number(active.id)
    const statusId = containerOf(id, dragColumns)!
    let cols = dragColumns
    const overStatus = containerOf(over.id, dragColumns)
    if (overStatus === statusId && typeof over.id === 'number' && over.id !== id) {
      const ids = dragColumns[statusId]
      cols = { ...dragColumns, [statusId]: arrayMove(ids, ids.indexOf(id), ids.indexOf(over.id)) }
    }
    const index = cols[statusId].indexOf(id)
    const status = statuses.find((s) => s.id === statusId)
    if (!status || (statusId === origin.statusId && index === origin.index)) {
      setDragColumns(null)
      return
    }
    commit(id, status, index, cols)
  }

  function moveToNext(task: Task, nextStatus: TaskStatus) {
    commit(task.id, nextStatus, columns[nextStatus.id]?.length ?? 0, null)
  }

  const activeTask = activeId !== null ? byId.get(activeId) : undefined

  return (
    <>
      <ViewHeader
        eyebrow={
          board.isPending
            ? t('Cargando…')
            : t('{n} abiertas · las completadas se ven {days} días', { n: tasks.filter((task) => !task.completed).length, days: DONE_DAYS })
        }
        title={t('Tablero')}
        filters={<ViewFilters value={filters} onChange={setFilters} />}
      />

      {board.isError && (
        <p className={pageStyles.error} role="alert">
          {t('No pudimos cargar el tablero. Revisa tu conexión e inténtalo de nuevo.')}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setDragColumns(null)
        }}
        accessibility={{
          screenReaderInstructions: { draggable: t(BOARD_HELP) },
          announcements: {
            onDragStart: ({ active }) => t('Tomaste "{title}".', { title: byId.get(Number(active.id))?.title ?? '' }),
            onDragOver: ({ over }) => (over ? t('Sobre {column}.', { column: columnName(over.id) }) : t('Fuera de las columnas.')),
            onDragEnd: ({ over }) => (over ? t('Soltada en {column}.', { column: columnName(over.id) }) : t('Movimiento cancelado.')),
            onDragCancel: () => t('Movimiento cancelado.'),
          },
        }}
      >
        <div
          className={styles.board}
          onClickCapture={(e) => {
            if (justDragged.current) e.preventDefault()
          }}
        >
          {statuses.map((status, i) => {
            const next = statuses[i + 1]
            const ids = columns[status.id] ?? []
            return (
              <BoardColumn key={status.id} status={status} count={ids.length}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  {ids.map((id) => {
                    const task = byId.get(id)
                    if (!task) return null
                    return (
                      <SortableCard key={id} task={task} next={next ? { name: statusName(next.name), onMove: () => moveToNext(task, next) } : undefined} />
                    )
                  })}
                </SortableContext>
                {ids.length === 0 && <p className={styles.columnEmpty}>{t('Suelta aquí una tarjeta')}</p>}
                <Link to={`/tareas/nueva?estado=${status.id}`} className={styles.addCard}>
                  + {t('Agregar tarjeta')}
                </Link>
              </BoardColumn>
            )
          })}
        </div>
        <DragOverlay dropAnimation={null}>{activeTask ? <TaskCard task={activeTask} dragging /> : null}</DragOverlay>
      </DndContext>
    </>
  )

  function columnName(id: UniqueIdentifier): string {
    const statusId = containerOf(id, dragColumns ?? columns)
    const name = statuses.find((s) => s.id === statusId)?.name
    return name ? statusName(name) : t('la columna')
  }
}

function BoardColumn({ status, count, children }: { status: TaskStatus; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(status.id) })
  return (
    <section ref={setNodeRef} className={`${styles.column} ${isOver ? styles.columnOver : ''}`} aria-labelledby={`col-title-${status.id}`}>
      <div className={styles.columnHead}>
        <span className={styles.dot} style={{ background: dotColor(status.color) }} aria-hidden="true" />
        <h2 id={`col-title-${status.id}`}>{statusName(status.name)}</h2>
        <span className={styles.count}>{count}</span>
      </div>
      {children}
    </section>
  )
}

function SortableCard({ task, next }: { task: Task; next?: { name: string; onMove: () => void } }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      className={`${styles.sortable} ${isDragging ? styles.placeholder : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="tarjeta movible"
      aria-label={task.parent ? t('{title}, subtarea de {parent}', { title: task.title, parent: task.parent.title }) : task.title}
    >
      <TaskCard task={task} next={next} />
    </div>
  )
}
