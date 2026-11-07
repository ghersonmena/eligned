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
import { t } from '../lib/i18n'

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
          <span className={pageStyles.eyebrow}>{isPending
              ? t('Cargando…')
              : showClosed
                ? goals.length === 1 ? t('1 cerrada') : t('{n} cerradas', { n: goals.length })
                : goals.length === 1 ? t('1 activa') : t('{n} activas', { n: goals.length })}</span>
          <h1 className={pageStyles.pageTitle}>{t('Metas')}</h1>
        </div>
        <div className={goalStyles.headerActions}>
          <div className={pageStyles.segmented} role="group" aria-label={t('Mostrar')}>
            <button type="button" className={pageStyles.themeOption} aria-checked={!showClosed} role="radio" onClick={() => setShowClosed(false)}>
              {t('Activas')}
            </button>
            <button type="button" className={pageStyles.themeOption} aria-checked={showClosed} role="radio" onClick={() => setShowClosed(true)}>
              {t('Cerradas')}
            </button>
          </div>
          {canEdit && !creating && (
            <button type="button" className={pageStyles.primary} onClick={() => setCreating(true)}>
              + {t('Nueva meta')}
            </button>
          )}
        </div>
      </div>

      {creating && <GoalForm onDone={() => setCreating(false)} />}

      {isError && (
        <p className={pageStyles.error} role="alert">
          {t('No pudimos cargar las metas.')}
        </p>
      )}

      {!isPending && goals.length === 0 && !creating && (
        <div className={projectStyles.empty}>
          <strong>{showClosed ? t('No hay metas cerradas') : t('Aún no tienes metas')}</strong>
          {!showClosed && (
            <>
              <span>{t('Una meta es un objetivo grande (por ejemplo, "Migrar la oficina antes de diciembre") que mides con resultados clave.')}</span>
              {canEdit && (
                <button type="button" className={pageStyles.primary} onClick={() => setCreating(true)}>
                  {t('Crear la primera')}
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
        {goal.key_results.length === 0 && <li className={goalStyles.noKrs}>{t('Sin resultados clave todavía')}</li>}
        {goal.key_results.length > 3 && <li className={goalStyles.noKrs}>{t('y {n} más…', { n: goal.key_results.length - 3 })}</li>}
      </ul>
      <span className={goalStyles.cardFoot}>
        {goal.owner ? goal.owner.name : t('Sin responsable')}
        {goal.due_date && ` · ${t('vence el {date}', { date: formatGoalDate(goal.due_date) })}`}
      </span>
    </Link>
  )
}
