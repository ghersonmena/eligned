import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Goal, KeyResult } from '../api/types'
import { GoalForm } from '../components/goals/GoalForm'
import { KeyResultForm } from '../components/goals/KeyResultForm'
import { ProgressRing } from '../components/goals/ProgressRing'
import goalStyles from '../components/goals/goals.module.css'
import { Icon } from '../components/Icon'
import { useMe } from '../hooks/useAuth'
import { useDeleteGoal, useDeleteKeyResult, useGoal, useUpdateGoal, useUpdateKeyResult } from '../hooks/useGoals'
import { celebrate } from '../lib/celebrate'
import { chipStyle, dotColor } from '../lib/colors'
import { formatGoalDate, HEALTH, krValueText } from '../lib/goals'
import { currentWorkspace } from '../lib/workspace'
import pageStyles from './pages.module.css'
import projectStyles from './projects.module.css'
import { t } from '../lib/i18n'

export function GoalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: goal, isPending, isError } = useGoal(Number(id))
  const { data: user } = useMe()
  const canEdit = user ? currentWorkspace(user)?.role !== 'guest' : false
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)

  if (isPending) return <p className={pageStyles.eyebrow}>{t('Cargando meta…')}</p>
  if (isError || !goal) {
    return (
      <section className={pageStyles.card}>
        <h2>{t('No encontramos esta meta')}</h2>
        <Link to="/metas">{t('Volver a metas')}</Link>
      </section>
    )
  }

  const health = HEALTH[goal.health]

  return (
    <>
      <nav aria-label={t('Ruta')} className={projectStyles.breadcrumb}>
        <Link to="/metas">{t('Metas')}</Link>
      </nav>
      <div className={goalStyles.detailHead}>
        <ProgressRing value={goal.progress} color={dotColor(goal.color)} size={96} stroke={9} />
        <div className={goalStyles.detailText}>
          <h1 className={pageStyles.pageTitle}>{goal.title}</h1>
          {goal.description && <p className={projectStyles.description}>{goal.description}</p>}
          <div className={goalStyles.facts}>
            <span className={goalStyles.health} style={{ color: health.color, borderColor: health.color }}>
              {goal.closed ? t('Cerrada') : health.label}
            </span>
            <span>
              <Icon name="team" size={14} /> {goal.owner?.name ?? t('Sin responsable')}
            </span>
            {(goal.start_date || goal.due_date) && (
              <span>
                <Icon name="calendar" size={14} />
                {goal.start_date && ` ${formatGoalDate(goal.start_date)} →`} {goal.due_date ? formatGoalDate(goal.due_date) : t('sin fecha límite')}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className={projectStyles.formActions}>
            {!editing && (
              <button type="button" className={pageStyles.secondary} onClick={() => setEditing(true)}>
                <Icon name="edit" size={18} /> {t('Editar')}
              </button>
            )}
            <button
              type="button"
              className={pageStyles.secondary}
              onClick={() => updateGoal.mutate({ id: goal.id, input: { closed: !goal.closed } })}
            >
              <Icon name="archive" size={18} /> {goal.closed ? t('Reabrir') : t('Cerrar meta')}
            </button>
            <button
              type="button"
              className={pageStyles.secondary}
              onClick={() =>
                window.confirm(t('¿Eliminar la meta "{title}" y sus resultados clave? Las tareas y proyectos no se tocan.', { title: goal.title })) &&
                deleteGoal.mutate(goal.id, { onSuccess: () => navigate('/metas') })
              }
            >
              <Icon name="trash" size={18} /> {t('Eliminar')}
            </button>
          </div>
        )}
      </div>

      {editing && <GoalForm key={goal.id} goal={goal} onDone={() => setEditing(false)} />}

      <section className={pageStyles.card} aria-labelledby="krs-title">
        <h2 id="krs-title">{t('Resultados clave')}</h2>
        <p className={goalStyles.hint}>{t('El avance de la meta es el promedio de sus resultados clave.')}</p>
        {goal.key_results.length === 0 && !adding && <p>{t('Agrega cómo vas a medir esta meta.')}</p>}
        <ul className={goalStyles.krList}>
          {goal.key_results.map((kr) => (
            <KeyResultRow key={kr.id} goal={goal} kr={kr} canEdit={canEdit} confetti={user?.preferences.confetti ?? true} />
          ))}
        </ul>
        {canEdit &&
          (adding ? (
            <KeyResultForm goalId={goal.id} onDone={() => setAdding(false)} />
          ) : (
            <button type="button" className={`${pageStyles.secondary} ${goalStyles.addKr}`} onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} /> {t('Agregar resultado clave')}
            </button>
          ))}
      </section>
    </>
  )
}

function KeyResultRow({ goal, kr, canEdit, confetti }: { goal: Goal; kr: KeyResult; canEdit: boolean; confetti: boolean }) {
  const update = useUpdateKeyResult()
  const remove = useDeleteKeyResult()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(kr.current_value))
  const color = dotColor(goal.color)

  if (editing) return <KeyResultForm goalId={goal.id} keyResult={kr} onDone={() => setEditing(false)} />

  function save(next: number) {
    if (Number.isNaN(next)) return
    update.mutate(
      { id: kr.id, input: { current_value: next } },
      {
        onSuccess: (saved) => {
          setValue(String(saved.current_value))
          if (saved.progress === 100 && kr.progress < 100) celebrate(confetti)
        },
      },
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save(Number(value))
  }

  return (
    <li className={goalStyles.kr}>
      <div className={goalStyles.krTop}>
        <strong>{kr.title}</strong>
        <span className={goalStyles.krPct}>{kr.progress}%</span>
      </div>
      <span className={goalStyles.krBar} aria-hidden="true">
        <span style={{ width: `${kr.progress}%`, background: color }} />
      </span>
      <div className={goalStyles.krBottom}>
        <span className={goalStyles.krValue}>{krValueText(kr)}</span>
        {kr.kind === 'tasks' && kr.project && (
          <Link to={`/proyectos/${kr.project.id}`} className={goalStyles.krProject} style={chipStyle(kr.project.color)}>
            {kr.project.name}
          </Link>
        )}
        {kr.kind === 'number' && canEdit && (
          <form className={goalStyles.krUpdate} onSubmit={onSubmit}>
            <button type="button" aria-label={t('Restar uno')} onClick={() => save(kr.current_value - 1)} disabled={update.isPending}>
              −
            </button>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              aria-label={t('Valor actual de {title}', { title: kr.title })}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button type="button" aria-label={t('Sumar uno')} onClick={() => save(kr.current_value + 1)} disabled={update.isPending}>
              +
            </button>
            {Number(value) !== kr.current_value && (
              <button type="submit" className={goalStyles.krSave} disabled={update.isPending}>
                {t('Guardar')}
              </button>
            )}
          </form>
        )}
        {canEdit && (
          <span className={goalStyles.krTools}>
            <button type="button" aria-label={t('Editar {title}', { title: kr.title })} onClick={() => setEditing(true)}>
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button"
              aria-label={t('Eliminar {title}', { title: kr.title })}
              onClick={() => window.confirm(t('¿Eliminar el resultado "{title}"?', { title: kr.title })) && remove.mutate(kr.id)}
            >
              <Icon name="trash" size={16} />
            </button>
          </span>
        )}
      </div>
    </li>
  )
}
