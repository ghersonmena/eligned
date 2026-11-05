import { useState } from 'react'
import { Link } from 'react-router'
import type { Goal } from '../api/types'
import { GoalForm } from '../components/goals/GoalForm'
import { ProgressRing } from '../components/goals/ProgressRing'
import goalStyles from '../components/goals/goals.module.css'
import { useMe } from '../hooks/useAuth'
import { useGoals } from '../hooks/useGoals'
import { dotColor } from '../lib/colors'
import { formatGoalDate, HEALTH, krValueText } from '../lib/goals'
import { currentWorkspace } from '../lib/workspace'
import pageStyles from './pages.module.css'
import projectStyles from './projects.module.css'

export function GoalsPage() {
  const [showClosed, setShowClosed] = useState(false)
  const [creating, setCreating] = useState(false)
  const { data: goals = [], isPending, isError } = useGoals(showClosed)
  const { data: user } = useMe()
  const canEdit = user ? currentWorkspace(user)?.role !== 'guest' : false

  return (
    <>
      <div className={projectStyles.header}>
        <div>
          <span className={pageStyles.eyebrow}>{isPending ? 'Cargando…' : `${goals.length} ${showClosed ? 'cerrada' : 'activa'}${goals.length === 1 ? '' : 's'}`}</span>
          <h1 className={pageStyles.pageTitle}>Metas</h1>
        </div>
        <div className={goalStyles.headerActions}>
          <div className={pageStyles.segmented} role="group" aria-label="Mostrar">
            <button type="button" className={pageStyles.themeOption} aria-checked={!showClosed} role="radio" onClick={() => setShowClosed(false)}>
              Activas
            </button>
            <button type="button" className={pageStyles.themeOption} aria-checked={showClosed} role="radio" onClick={() => setShowClosed(true)}>
              Cerradas
            </button>
          </div>
          {canEdit && !creating && (
            <button type="button" className={pageStyles.primary} onClick={() => setCreating(true)}>
              + Nueva meta
            </button>
          )}
        </div>
      </div>

      {creating && <GoalForm onDone={() => setCreating(false)} />}

      {isError && (
        <p className={pageStyles.error} role="alert">
          No pudimos cargar las metas.
        </p>
      )}

      {!isPending && goals.length === 0 && !creating && (
        <div className={projectStyles.empty}>
          <strong>{showClosed ? 'No hay metas cerradas' : 'Aún no tienes metas'}</strong>
          {!showClosed && (
            <>
              <span>Una meta es un objetivo grande (por ejemplo, "Migrar la oficina antes de diciembre") que mides con resultados clave.</span>
              {canEdit && (
                <button type="button" className={pageStyles.primary} onClick={() => setCreating(true)}>
                  Crear la primera
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className={goalStyles.grid}>
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>
    </>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const health = HEALTH[goal.health]
  return (
    <Link to={`/metas/${goal.id}`} className={goalStyles.card} style={{ borderTopColor: dotColor(goal.color) }}>
      <div className={goalStyles.cardTop}>
        <ProgressRing value={goal.progress} color={dotColor(goal.color)} />
        <div className={goalStyles.cardTitle}>
          <strong>{goal.title}</strong>
          <span className={goalStyles.health} style={{ color: health.color, borderColor: health.color }}>
            {health.label}
          </span>
        </div>
      </div>
      <ul className={goalStyles.miniKrs}>
        {goal.key_results.slice(0, 3).map((kr) => (
          <li key={kr.id}>
            <span className={goalStyles.miniTitle}>{kr.title}</span>
            <span className={goalStyles.miniBar} aria-hidden="true">
              <span style={{ width: `${kr.progress}%`, background: dotColor(goal.color) }} />
            </span>
            <span className={goalStyles.miniValue}>{krValueText(kr)}</span>
          </li>
        ))}
        {goal.key_results.length === 0 && <li className={goalStyles.noKrs}>Sin resultados clave todavía</li>}
        {goal.key_results.length > 3 && <li className={goalStyles.noKrs}>y {goal.key_results.length - 3} más…</li>}
      </ul>
      <span className={goalStyles.cardFoot}>
        {goal.owner ? goal.owner.name : 'Sin responsable'}
        {goal.due_date && ` · vence el ${formatGoalDate(goal.due_date)}`}
      </span>
    </Link>
  )
}
