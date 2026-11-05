import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import type { KeyResult, KeyResultInput } from '../../api/types'
import { useAddKeyResult, useUpdateKeyResult } from '../../hooks/useGoals'
import { useProjects } from '../../hooks/useWorkspaceData'
import pageStyles from '../../pages/pages.module.css'
import projectStyles from '../../pages/projects.module.css'
import styles from './goals.module.css'

/** Add a key result to a goal, or edit one. */
export function KeyResultForm({ goalId, keyResult, onDone }: { goalId: number; keyResult?: KeyResult; onDone: () => void }) {
  const add = useAddKeyResult()
  const update = useUpdateKeyResult()
  const { data: projects = [] } = useProjects()
  const [title, setTitle] = useState(keyResult?.title ?? '')
  const [kind, setKind] = useState<KeyResult['kind']>(keyResult?.kind ?? 'number')
  const [start, setStart] = useState(String(keyResult?.start_value ?? 0))
  const [target, setTarget] = useState(String(keyResult?.target_value ?? ''))
  const [unit, setUnit] = useState(keyResult?.unit ?? '')
  const [projectId, setProjectId] = useState(keyResult?.project ? String(keyResult.project.id) : '')
  const saving = keyResult ? update : add
  const ready = title.trim() !== '' && (kind === 'tasks' ? projectId !== '' : target !== '' && !Number.isNaN(Number(target)))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    const input: KeyResultInput =
      kind === 'tasks'
        ? { title: title.trim(), kind, project_id: Number(projectId) }
        : { title: title.trim(), kind, start_value: Number(start) || 0, target_value: Number(target), unit: unit.trim() || null }
    if (keyResult) update.mutate({ id: keyResult.id, input }, { onSuccess: onDone })
    else add.mutate({ goalId, input }, { onSuccess: onDone })
  }

  const error = saving.error instanceof ApiError ? (Object.values(saving.error.errors)[0]?.[0] ?? saving.error.message) : null

  return (
    <form className={styles.krForm} onSubmit={onSubmit}>
      <label className={pageStyles.field}>
        Resultado clave
        <input
          className={`${pageStyles.input} caps`}
          autoCapitalize="characters"
          value={title}
          maxLength={255}
          autoFocus
          placeholder="Ej. Equipos migrados"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className={styles.kindPicker} role="radiogroup" aria-label="Cómo se mide">
        <button type="button" role="radio" aria-checked={kind === 'number'} onClick={() => setKind('number')}>
          <strong>Con un número</strong>
          <span>Lo actualizas a mano: de 0 a 20 equipos, de 40% a 90%…</span>
        </button>
        <button type="button" role="radio" aria-checked={kind === 'tasks'} onClick={() => setKind('tasks')}>
          <strong>Con las tareas de un proyecto</strong>
          <span>Avanza solo conforme se terminan sus tareas.</span>
        </button>
      </div>
      {kind === 'number' ? (
        <div className={styles.formRow}>
          <label className={pageStyles.field}>
            Valor inicial
            <input className={pageStyles.input} type="number" inputMode="decimal" step="any" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className={pageStyles.field}>
            Meta
            <input className={pageStyles.input} type="number" inputMode="decimal" step="any" required value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label className={pageStyles.field}>
            Unidad (opcional)
            <input
              className={`${pageStyles.input} caps`}
              autoCapitalize="characters"
              maxLength={30}
              placeholder="equipos, %, $…"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <label className={pageStyles.field}>
          Proyecto
          <select className={pageStyles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Elige un proyecto…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p className={pageStyles.error} role="alert">
          {error}
        </p>
      )}
      <div className={projectStyles.formActions}>
        <button type="submit" className={pageStyles.primary} disabled={!ready || saving.isPending}>
          {keyResult ? 'Guardar' : 'Agregar resultado'}
        </button>
        <button type="button" className={pageStyles.secondary} onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
