import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useBlocker } from 'react-router'
import type { Priority } from '../../api/types'
import { useMembers, useProjects, useStatuses } from '../../hooks/useWorkspaceData'
import { PRIORITIES } from '../../lib/colors'
import { initials } from '../../lib/initials'
import { startAfterDue, type TaskFormValues } from '../../lib/taskForm'
import { Icon } from '../Icon'
import { statusName } from '../../lib/statuses'
import styles from './TaskForm.module.css'
import { t } from '../../lib/i18n'

interface TaskFormProps {
  initial: TaskFormValues
  submitLabel: string
  pending: boolean
  errorMessage?: string
  /** Subtasks inherit the parent's project, so the field is hidden. */
  showProject?: boolean
  /** The dates come from the subtasks: shown, but not editable here. */
  datesLocked?: boolean
  /** Completed only through its subtasks: can't be moved into/out of a "done" status here. */
  completionLocked?: boolean
  onSubmit: (values: TaskFormValues) => Promise<unknown>
  onCancel?: () => void
}

/**
 * Full task form with an explicit "Guardar" button. Warns before leaving the
 * page with unsaved changes.
 */
export function TaskForm({
  initial,
  submitLabel,
  pending,
  errorMessage,
  showProject = true,
  datesLocked = false,
  completionLocked = false,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { data: statuses = [] } = useStatuses()
  const { data: projects = [] } = useProjects()
  const { data: members = [] } = useMembers()
  const [values, setValues] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [titleError, setTitleError] = useState(false)
  const leavingAfterSave = useRef(false)

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)
  const initialDone = statuses.find((s) => String(s.id) === initial.statusId)?.is_done ?? false

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leavingAfterSave.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(t('Tienes cambios sin guardar. ¿Salir sin guardarlos?'))) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  function toggleAssignee(id: number) {
    set('assigneeIds', values.assigneeIds.includes(id) ? values.assigneeIds.filter((a) => a !== id) : [...values.assigneeIds, id])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.title.trim()) {
      setTitleError(true)
      return
    }
    if (startAfterDue(values)) return
    leavingAfterSave.current = true
    try {
      await onSubmit(values)
      setBaseline(values)
    } catch {
      // The page shows the error through `errorMessage`; keep the user's input.
    } finally {
      leavingAfterSave.current = false
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.field}>
        {t('Título')}
        <input
          className={`${styles.titleInput} caps`}
          autoCapitalize="characters"
          value={values.title}
          maxLength={255}
          required
          autoFocus={!initial.title}
          placeholder={t('¿Qué hay que hacer?')}
          aria-invalid={titleError ? true : undefined}
          onChange={(e) => {
            set('title', e.target.value)
            setTitleError(false)
          }}
        />
        {titleError && <span className={styles.error}>{t('Escribe un título para la tarea.')}</span>}
      </label>

      <div className={styles.grid}>
        <label className={styles.field}>
          {t('Estado')}
          <select
            value={values.statusId}
            aria-describedby={completionLocked ? 'status-locked' : undefined}
            onChange={(e) => set('statusId', e.target.value)}
          >
            {!values.statusId && <option value="">{t('Por hacer')}</option>}
            {statuses.map((s) => (
              <option key={s.id} value={s.id} disabled={completionLocked && s.is_done !== initialDone}>
                {statusName(s.name)}
              </option>
            ))}
          </select>
          {completionLocked && (
            <span id="status-locked" className={styles.hint}>
              {t('Se completa al cerrar todas sus subtareas.')}
            </span>
          )}
        </label>
        <label className={styles.field}>
          {t('Prioridad')}
          <select value={values.priority} onChange={(e) => set('priority', Number(e.target.value) as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {showProject && (
          <label className={styles.field}>
            {t('Proyecto')}
            <select value={values.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">{t('Sin proyecto')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className={styles.field}>
        <span id="due-label">{t('Fecha límite')}</span>
        <div className={styles.dueRow} role="group" aria-labelledby="due-label">
          <input
            type="date"
            className={styles.dateInput}
            aria-label={t('Día')}
            disabled={datesLocked}
            aria-describedby={datesLocked ? 'dates-locked' : undefined}
            value={values.dueDate}
            onChange={(e) => setValues((v) => ({ ...v, dueDate: e.target.value, dueTime: e.target.value ? v.dueTime : '' }))}
          />
          <input
            type="time"
            className={styles.timeInput}
            aria-label={t('Hora (opcional)')}
            value={values.dueTime}
            disabled={!values.dueDate || datesLocked}
            onChange={(e) => set('dueTime', e.target.value)}
          />
          {values.dueDate && !datesLocked && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => setValues((v) => ({ ...v, dueDate: '', dueTime: '' }))}
            >
              <Icon name="close" size={16} />
              {t('Quitar fecha')}
            </button>
          )}
        </div>
        {datesLocked ? (
          <span id="dates-locked" className={styles.hint}>
            {t('Las fechas se calculan con las subtareas: empieza con la primera y termina con la última. Cambia las fechas de las subtareas para moverla.')}
          </span>
        ) : (
          <span className={styles.hint}>{t('La hora es opcional: sin hora, la tarea vence al final del día.')}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="start-date">{t('Fecha de inicio (opcional)')}</label>
        <div className={styles.dueRow}>
          <input
            id="start-date"
            type="date"
            className={styles.dateInput}
            value={values.startDate}
            disabled={datesLocked}
            max={values.dueDate || undefined}
            aria-invalid={startAfterDue(values) ? true : undefined}
            aria-describedby={datesLocked ? 'dates-locked' : 'start-hint'}
            onChange={(e) => set('startDate', e.target.value)}
          />
          {values.startDate && !datesLocked && (
            <button type="button" className={styles.clear} onClick={() => set('startDate', '')}>
              <Icon name="close" size={16} />
              {t('Quitar inicio')}
            </button>
          )}
        </div>
        {datesLocked ? null : startAfterDue(values) ? (
          <span id="start-hint" className={styles.error}>
            {t('El inicio no puede ser después de la fecha límite.')}
          </span>
        ) : (
          <span id="start-hint" className={styles.hint}>
            {t('Con inicio y fecha límite, la tarea se dibuja como una barra en el cronograma.')}
          </span>
        )}
      </div>

      {members.length > 0 && (
        <fieldset className={styles.assignees}>
          <legend>{t('Responsables')}</legend>
          {members.map((m) => (
            <label key={m.id} className={styles.assignee}>
              <input type="checkbox" checked={values.assigneeIds.includes(m.id)} onChange={() => toggleAssignee(m.id)} />
              <span className={styles.avatar} aria-hidden="true">
                {initials(m.name)}
              </span>
              {m.name}
            </label>
          ))}
        </fieldset>
      )}

      <label className={styles.field}>
        {t('Descripción')}
        <textarea
          rows={4}
          className="caps"
          autoCapitalize="characters"
          placeholder={t('Agrega detalles, pasos o enlaces…')}
          value={values.description}
          maxLength={20000}
          onChange={(e) => set('description', e.target.value)}
        />
      </label>

      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.save} disabled={pending || (!dirty && !!initial.title)}>
          {pending ? (
            <>
              <span className={styles.spinner} aria-hidden="true" /> {t('Guardando…')}
            </>
          ) : (
            submitLabel
          )}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={pending}>
            {t('Cancelar')}
          </button>
        )}
        {dirty && !pending && initial.title && (
          <button type="button" className={styles.cancel} onClick={() => setValues(baseline)}>
            {t('Descartar cambios')}
          </button>
        )}
        {!dirty && initial.title && !pending && <span className={styles.savedNote}>{t('Todo guardado')}</span>}
      </div>
    </form>
  )
}
