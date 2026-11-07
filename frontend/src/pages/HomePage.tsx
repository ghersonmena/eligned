import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, type KeyboardEventHandler, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { HomeCardId, HomeCardSetting, User } from '../api/auth'
import { ActivityCard, GoalsCard, ProjectsCard, TeamCard, UpcomingCard } from '../components/home/HomeCards'
import { AgendaCard, NotesCard } from '../components/home/PlannerCards'
import { CommentsCard, PriorityCard, QuickAddCard, RhythmCard, StaleCard, TimeByProjectCard } from '../components/home/MoreCards'
import homeStyles from '../components/home/home.module.css'
import { TaskRow } from '../components/tasks/TaskRow'
import taskStyles from '../components/tasks/tasks.module.css'
import { TrackerCard } from '../components/time/TrackerCard'
import { useUpdatePreferences } from '../hooks/useAuth'
import { useTasks } from '../hooks/useWorkspaceData'
import { dueGroup } from '../lib/dates'
import { currentWorkspace } from '../lib/workspace'
import { DEFAULT_LAYOUT, HOME_CARDS, moveCard, resolveLayout, toggleCard } from '../lib/homeLayout'
import styles from './pages.module.css'
import { t, tk } from '../lib/i18n'

function greetingFor(hour: number) {
  if (hour < 12) return t('Buenos días,')
  if (hour < 19) return t('Buenas tardes,')
  return t('Buenas noches,')
}

const CARD_CLASS = styles.card

const CARDS: Record<HomeCardId, (ctx: { canEdit: boolean; user: User }) => ReactNode> = {
  today: () => <TodayCard />,
  tracker: () => <TrackerCard className={`${CARD_CLASS} ${styles.cardTracker}`} />,
  activity: () => <ActivityCard className={CARD_CLASS} />,
  goals: () => <GoalsCard className={CARD_CLASS} />,
  upcoming: () => <UpcomingCard className={CARD_CLASS} />,
  projects: () => <ProjectsCard className={CARD_CLASS} />,
  team: () => <TeamCard className={CARD_CLASS} />,
  quick: ({ canEdit }) => <QuickAddCard className={CARD_CLASS} canEdit={canEdit} />,
  priority: () => <PriorityCard className={CARD_CLASS} />,
  rhythm: () => <RhythmCard className={CARD_CLASS} />,
  time: () => <TimeByProjectCard className={CARD_CLASS} />,
  stale: () => <StaleCard className={CARD_CLASS} />,
  comments: () => <CommentsCard className={CARD_CLASS} />,
  notes: ({ user }) => <NotesCard className={CARD_CLASS} initial={user.preferences.home_note} />,
  agenda: () => <AgendaCard className={CARD_CLASS} />,
}

export function HomePage({ user }: { user: User }) {
  const [hour] = useState(() => new Date().getHours())
  const firstName = user.name.split(' ')[0]
  const updatePreferences = useUpdatePreferences()
  const canEdit = currentWorkspace(user)?.role !== 'guest'
  const [editing, setEditing] = useState(false)
  // Shown right away while it saves.
  const [draft, setDraft] = useState<HomeCardSetting[] | null>(null)
  const layout = draft ?? resolveLayout(user.preferences.home_layout)

  function change(next: HomeCardSetting[] | null) {
    setDraft(next ?? DEFAULT_LAYOUT)
    updatePreferences.mutate({ home_layout: next })
  }

  const visible = editing ? layout : layout.filter((c) => !c.hidden)

  const sensors = useSensors(
    // Mouse and touch apart: on phones a long press picks the card up and a swipe still scrolls.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) change(moveCard(layout, active.id as HomeCardId, over.id as HomeCardId))
  }
  const label = (id: HomeCardId) => HOME_CARDS.find((c) => c.id === id)?.label ?? id

  return (
    <>
      <div className={homeStyles.headRow}>
        <h1 className={styles.greeting}>
          <span>{greetingFor(hour)}</span> {firstName}
        </h1>
        <div className={homeStyles.editBar}>
          {editing && (
            <button type="button" className={styles.secondary} onClick={() => change(null)}>
              {t('Restablecer')}
            </button>
          )}
          <button
            type="button"
            className={editing ? styles.primary : styles.secondary}
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? t('Listo') : t('Personalizar')}
          </button>
          {editing && <p className={homeStyles.editHint}>{t('Arrastra las tarjetas para acomodarlas (en el celular, mantén presionada la tarjeta) y oculta las que no uses. Se guarda solo.')}</p>}
        </div>
      </div>

      {visible.length === 0 && (
        <section className={styles.card}>
          <h2>{t('Ocultaste todas las tarjetas')}</h2>
          <p>{t('Pulsa "Personalizar" para volver a mostrar alguna.')}</p>
        </section>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: { draggable: t(DRAG_HELP) },
          announcements: {
            onDragStart: ({ active }) => t('Tomaste la tarjeta {name}.', { name: label(active.id as HomeCardId) }),
            onDragOver: ({ over }) => (over ? t('Sobre el lugar de {name}.', { name: label(over.id as HomeCardId) }) : t('Fuera del inicio.')),
            onDragEnd: ({ over }) => (over ? t('Tarjeta colocada en el lugar de {name}.', { name: label(over.id as HomeCardId) }) : t('Movimiento cancelado.')),
            onDragCancel: () => t('Movimiento cancelado.'),
          },
        }}
      >
        <SortableContext items={visible.map((c) => c.id)} strategy={rectSortingStrategy}>
          <div className={`${styles.grid} ${styles.homeGrid}`}>
            {visible.map((card) =>
              editing ? (
                <SortableSlot key={card.id} card={card} label={label(card.id)} onToggle={() => change(toggleCard(layout, card.id))}>
                  {CARDS[card.id]({ canEdit, user })}
                </SortableSlot>
              ) : (
                <div key={card.id} className={homeStyles.slot}>
                  {CARDS[card.id]({ canEdit, user })}
                </div>
              ),
            )}
          </div>
        </SortableContext>
      </DndContext>
    </>
  )
}

const DRAG_HELP = tk(
  'Para mover una tarjeta con el teclado, enfoca su botón de mover y pulsa espacio. Usa las flechas para llevarla a otro lugar y espacio otra vez para soltarla, o Escape para cancelar.',
)

/** A card while "Personalizar" is on: drag it anywhere (long press on touch screens). */
function SortableSlot({ card, label, onToggle, children }: { card: HomeCardSetting; label: string; onToggle: () => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  // Mouse and touch grab the whole card; the keyboard uses the handle so "Ocultar" keeps working.
  const { onKeyDown, ...grab } = (listeners ?? {}) as { onKeyDown?: KeyboardEventHandler } & Record<string, unknown>
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={[homeStyles.slot, homeStyles.editing, card.hidden && homeStyles.hidden, isDragging && homeStyles.dragging].filter(Boolean).join(' ')}
      {...grab}
    >
      {children}
      <div className={homeStyles.tools} role="group" aria-label={t('Tarjeta {name}', { name: label })}>
        <button ref={setActivatorNodeRef} type="button" className={homeStyles.handle} {...attributes} onKeyDown={onKeyDown} aria-label={t('Mover {name}', { name: label })}>
          <span aria-hidden="true">⠿</span> {t('Mover')}
        </button>
        <button type="button" aria-pressed={!card.hidden} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={onToggle}>
          {card.hidden ? t('Mostrar') : t('Ocultar')}
        </button>
      </div>
    </div>
  )
}

function TodayCard() {
  const { data: tasks = [], isPending } = useTasks({ status: 'open' })
  const today = tasks.filter((t) => ['overdue', 'today'].includes(dueGroup(t.due_at)))

  return (
    <section className={`${styles.card} ${styles.cardToday}`}>
      <h2>
        {t('Para hoy')}
        {today.length > 0 && <span className={styles.count}> · {today.length}</span>}
      </h2>
      {isPending && <p>{t('Cargando…')}</p>}
      {!isPending && today.length === 0 && (
        <p>
          {t('Nada pendiente para hoy.')} {tasks.length > 0 ? t('Tienes {n} tareas abiertas más adelante.', { n: tasks.length }) : ''}
        </p>
      )}
      {today.length > 0 && (
        <div className={styles.cardScroll} tabIndex={0} aria-label={t('Tareas para hoy')}>
          <ul className={taskStyles.list}>
            {today.map((task) => (
              <TaskRow key={task.id} task={task} showTimer />
            ))}
          </ul>
        </div>
      )}
      <Link to="/tareas">{t('Ver todas mis tareas')}</Link>
    </section>
  )
}
