import { useState, type FormEvent } from 'react'
import type { Goal, GoalInput, ProjectColor } from '../../api/types'
import { useCreateGoal, useUpdateGoal } from '../../hooks/useGoals'
import { useMembers } from '../../hooks/useWorkspaceData'
import { dotColor, PROJECT_COLORS } from '../../lib/colors'
import pageStyles from '../../pages/pages.module.css'
import projectStyles from '../../pages/projects.module.css'
import styles from './goals.module.css'
import { t } from '../../lib/i18n'

/** New goal, or edit one when `goal` is given. */
export function GoalForm({ goal, onDone }: { goal?: Goal; onDone: (saved?: Goal) => void }) {
  const create = useCreateGoal()
  const update = useUpdateGoal()
  const { data: members = [] } = useMembers()
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [color, setColor] = useState<ProjectColor>(goal?.color ?? 'teal')
  const [ownerId, setOwnerId] = useState<string>(goal?.owner ? String(goal.owner.id) : '')
  const [start, setStart] = useState(goal?.start_date ?? '')
  const [due, setDue] = useState(goal?.due_date ?? '')
  const saving = goal ? update : create
  const badDates = !!start && !!due && due < start

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || badDates) return
    const input: GoalInput = {
      title: title.trim(),
      description: description.trim() || null,
      color,
      owner_id: ownerId ? Number(ownerId) : null,
      start_date: start || null,
      due_date: due || null,
    }
    if (goal) update.mutate({ id: goal.id, input }, { onSuccess: onDone })
    else create.mutate(input, { onSuccess: onDone })
  }

  return (
    <form className={`${pageStyles.card} ${styles.form}`} onSubmit={onSubmit}>
      <h2>{goal ? t('Editar meta') : t('Nueva meta')}</h2>
      <label className={pageStyles.field}>
        {t('¿Qué quieres lograr?')}
        <input
          className={`${pageStyles.input} caps`}
          autoCapitalize="characters"
          value={title}
          maxLength={255}
          required
          autoFocus
          placeholder={t('Ej. Migrar todos los equipos a Windows 11')}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className={pageStyles.field}>
        {t('Descripción (opcional)')}
        <textarea
          className={`${pageStyles.input} ${styles.textarea} caps`}
          autoCapitalize="characters"
          rows={2}
          value={description}
          maxLength={5000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className={styles.formRow}>
        <label className={pageStyles.field}>
          {t('Responsable')}
          <select className={pageStyles.input} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">{t('Sin responsable')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className={pageStyles.field}>
          {t('Fecha de inicio')}
          <input type="date" className={pageStyles.input} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className={pageStyles.field}>
          {t('Fecha límite')}
          <input
            type="date"
            className={pageStyles.input}
            value={due}
            min={start || undefined}
            aria-invalid={badDates ? true : undefined}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
      </div>
      {badDates && (
        <p className={pageStyles.error} role="alert">
          {t('La fecha límite no puede ser antes del inicio.')}
        </p>
      )}
      <fieldset className={projectStyles.colors}>
        <legend>{t('Color')}</legend>
        {PROJECT_COLORS.map((c) => (
          <label key={c.value} className={projectStyles.colorOption} title={c.label}>
            <input type="radio" name="goal-color" value={c.value} checked={color === c.value} onChange={() => setColor(c.value)} aria-label={c.label} />
            <span style={{ background: dotColor(c.value) }} />
          </label>
        ))}
      </fieldset>
      {saving.isError && (
        <p className={pageStyles.error} role="alert">
          {t('No se pudo guardar la meta.')}
        </p>
      )}
      <div className={projectStyles.formActions}>
        <button type="submit" className={pageStyles.primary} disabled={!title.trim() || badDates || saving.isPending}>
          {goal ? t('Guardar cambios') : t('Crear meta')}
        </button>
        <button type="button" className={pageStyles.secondary} onClick={() => onDone()}>
          {t('Cancelar')}
        </button>
      </div>
    </form>
  )
}
