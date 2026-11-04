import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useBlocker } from 'react-router'
import type { Priority } from '../../api/types'
import { useMembers, useProjects, useStatuses } from '../../hooks/useWorkspaceData'
import { PRIORITIES } from '../../lib/colors'
import { initials } from '../../lib/initials'
import { startAfterDue, type TaskFormValues } from '../../lib/taskForm'
import { Icon } from '../Icon'
import styles from './TaskForm.module.css'

interface TaskFormProps {
  initial: TaskFormValues
  submitLabel: string
  pending: boolean
  errorMessage?: string
  /** Subtasks inherit the parent's project, so the field is hidden. */
  showProject?: boolean
  onSubmit: (values: TaskFormValues) => Promise<unknown>
  onCancel?: () => void
}

/**
 * Full task form with an explicit "Guardar" button. Warns before leaving the
 * page with unsaved changes.
 */
export function TaskForm({ initial, submitLabel, pending, errorMessage, showProject = true, onSubmit, onCancel }: TaskFormProps) {
  const { data: statuses = [] } = useStatuses()
  const { data: projects = [] } = useProjects()
  const { data: members = [] } = useMembers()
  const [values, setValues] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [titleError, setTitleError] = useState(false)
  const leavingAfterSave = useRef(false)

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leavingAfterSave.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?')) blocker.proceed()
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
        Título
        <input
          className={styles.titleInput}
          value={values.title}
          maxLength={255}
          required
          autoFocus={!initial.title}
          placeholder="¿Qué hay que hacer?"
          aria-invalid={titleError ? true : undefined}
          onChange={(e) => {
            set('title', e.target.value)
            setTitleError(false)
          }}
        />
        {titleError && <span className={styles.error}>Escribe un título para la tarea.</span>}
      </label>

      <div className={styles.grid}>
        <label className={styles.field}>
          Estado
          <select value={values.statusId} onChange={(e) => set('statusId', e.target.value)}>
            {!values.statusId && <option value="">Por hacer</option>}
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Prioridad
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
            Proyecto
            <select value={values.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">Sin proyecto</option>
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
        <span id="due-label">Fecha límite</span>
        <div className={styles.dueRow} role="group" aria-labelledby="due-label">
          <input
            type="date"
            className={styles.dateInput}
            aria-label="Día"
            value={values.dueDate}
            onChange={(e) => setValues((v) => ({ ...v, dueDate: e.target.value, dueTime: e.target.value ? v.dueTime : '' }))}
          />
          <input
            type="time"
            className={styles.timeInput}
            aria-label="Hora (opcional)"
            value={values.dueTime}
            disabled={!values.dueDate}
            onChange={(e) => set('dueTime', e.target.value)}
          />
          {values.dueDate && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => setValues((v) => ({ ...v, dueDate: '', dueTime: '' }))}
            >
              <Icon name="close" size={16} />
              Quitar fecha
            </button>
          )}
        </div>
        <span className={styles.hint}>La hora es opcional: sin hora, la tarea vence al final del día.</span>
      </div>

      <div className={styles.field}>
        <label htmlFor="start-date">Fecha de inicio (opcional)</label>
        <div className={styles.dueRow}>
          <input
            id="start-date"
            type="date"
            className={styles.dateInput}
            value={values.startDate}
            max={values.dueDate || undefined}
            aria-invalid={startAfterDue(values) ? true : undefined}
            aria-describedby="start-hint"
            onChange={(e) => set('startDate', e.target.value)}
          />
          {values.startDate && (
            <button type="button" className={styles.clear} onClick={() => set('startDate', '')}>
              <Icon name="close" size={16} />
              Quitar inicio
            </button>
          )}
        </div>
        {startAfterDue(values) ? (
          <span id="start-hint" className={styles.error}>
            El inicio no puede ser después de la fecha límite.
          </span>
        ) : (
          <span id="start-hint" className={styles.hint}>
            Con inicio y fecha límite, la tarea se dibuja como una barra en el cronograma.
          </span>
        )}
      </div>

      {members.length > 0 && (
        <fieldset className={styles.assignees}>
          <legend>Responsables</legend>
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
        Descripción
        <textarea
          rows={4}
          placeholder="Agrega detalles, pasos o enlaces…"
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
              <span className={styles.spinner} aria-hidden="true" /> Guardando…
            </>
          ) : (
            submitLabel
          )}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={pending}>
            Cancelar
          </button>
        )}
        {dirty && !pending && initial.title && (
          <button type="button" className={styles.cancel} onClick={() => setValues(baseline)}>
            Descartar cambios
          </button>
        )}
        {!dirty && initial.title && !pending && <span className={styles.savedNote}>Todo guardado</span>}
      </div>
    </form>
  )
}
