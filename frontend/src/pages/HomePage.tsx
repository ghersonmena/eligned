import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { HomeCardId, HomeCardSetting, User } from '../api/auth'
import { ActivityCard, GoalsCard, ProjectsCard, TeamCard, UpcomingCard } from '../components/home/HomeCards'
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

function greetingFor(hour: number) {
  if (hour < 12) return 'Buenos días,'
  if (hour < 19) return 'Buenas tardes,'
  return 'Buenas noches,'
}

const CARD_CLASS = styles.card

const CARDS: Record<HomeCardId, (ctx: { canEdit: boolean }) => ReactNode> = {
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
              Restablecer
            </button>
          )}
          <button
            type="button"
            className={editing ? styles.primary : styles.secondary}
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Listo' : 'Personalizar'}
          </button>
          {editing && <p className={homeStyles.editHint}>Mueve las tarjetas con las flechas y oculta las que no uses. Se guarda solo.</p>}
        </div>
      </div>

      {visible.length === 0 && (
        <section className={styles.card}>
          <h2>Ocultaste todas las tarjetas</h2>
          <p>Pulsa "Personalizar" para volver a mostrar alguna.</p>
        </section>
      )}

      <div className={`${styles.grid} ${styles.homeGrid}`}>
        {visible.map((card, i) => (
          <div
            key={card.id}
            className={[homeStyles.slot, editing && homeStyles.editing, card.hidden && homeStyles.hidden].filter(Boolean).join(' ')}
          >
            {CARDS[card.id]({ canEdit })}
            {editing && (
              <div className={homeStyles.tools} role="group" aria-label={`Tarjeta ${label(card.id)}`}>
                <button type="button" aria-label={`Subir ${label(card.id)}`} disabled={i === 0} onClick={() => change(moveCard(layout, card.id, -1))}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${label(card.id)}`}
                  disabled={i === visible.length - 1}
                  onClick={() => change(moveCard(layout, card.id, 1))}
                >
                  ↓
                </button>
                <button type="button" aria-pressed={!card.hidden} onClick={() => change(toggleCard(layout, card.id))}>
                  {card.hidden ? 'Mostrar' : 'Ocultar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function TodayCard() {
  const { data: tasks = [], isPending } = useTasks({ status: 'open' })
  const today = tasks.filter((t) => ['overdue', 'today'].includes(dueGroup(t.due_at)))

  return (
    <section className={`${styles.card} ${styles.cardToday}`}>
      <h2>
        Para hoy{today.length > 0 && <span className={styles.count}> · {today.length}</span>}
      </h2>
      {isPending && <p>Cargando…</p>}
      {!isPending && today.length === 0 && (
        <p>Nada pendiente para hoy. {tasks.length > 0 ? `Tienes ${tasks.length} tareas abiertas más adelante.` : ''}</p>
      )}
      {today.length > 0 && (
        <div className={styles.cardScroll} tabIndex={0} aria-label="Tareas para hoy">
          <ul className={taskStyles.list}>
            {today.map((task) => (
              <TaskRow key={task.id} task={task} showTimer />
            ))}
          </ul>
        </div>
      )}
      <Link to="/tareas">Ver todas mis tareas</Link>
    </section>
  )
}
