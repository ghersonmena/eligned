import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { ProjectColor } from '../api/types'
import { Icon } from '../components/Icon'
import { useCreateProject, useProjects } from '../hooks/useWorkspaceData'
import { chipStyle, dotColor, PROJECT_COLORS } from '../lib/colors'
import styles from './projects.module.css'
import pageStyles from './pages.module.css'

export function ProjectsPage() {
  const { data: projects = [], isPending, isError } = useProjects()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className={styles.header}>
        <div>
          <span className={pageStyles.eyebrow}>{isPending ? 'Cargando…' : `${projects.length} activos`}</span>
          <h1 className={pageStyles.pageTitle}>Proyectos</h1>
        </div>
        {!creating && (
          <button type="button" className={pageStyles.primary} onClick={() => setCreating(true)}>
            + Nuevo proyecto
          </button>
        )}
      </div>

      {creating && <NewProjectForm onDone={() => setCreating(false)} />}

      {isError && (
        <p className={pageStyles.error} role="alert">
          No pudimos cargar los proyectos.
        </p>
      )}

      {!isPending && projects.length === 0 && !creating && (
        <div className={styles.empty}>
          <strong>Aún no tienes proyectos</strong>
          <span>Agrupa tus tareas por proyecto: soporte, infraestructura, una migración…</span>
          <button type="button" className={pageStyles.primary} onClick={() => setCreating(true)}>
            Crear el primero
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {projects.map((p) => {
          const open = p.open_tasks_count ?? 0
          const done = p.done_tasks_count ?? 0
          const total = open + done
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <Link key={p.id} to={`/proyectos/${p.id}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.badge} style={chipStyle(p.color)} aria-hidden="true">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <strong className={styles.name}>{p.name}</strong>
              </div>
              {p.description && <p className={styles.description}>{p.description}</p>}
              <div className={styles.progressRow}>
                <span className={styles.progress} aria-hidden="true">
                  <span style={{ width: `${pct}%`, background: dotColor(p.color) }} />
                </span>
                <span className={styles.pct}>{pct}%</span>
              </div>
              <span className={styles.counts}>
                {open} abiertas · {done} completadas
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

export function NewProjectForm({ onDone }: { onDone: () => void }) {
  const createProject = useCreateProject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<ProjectColor>('orange')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    createProject.mutate(
      { name: name.trim(), description: description.trim() || null, color },
      { onSuccess: onDone },
    )
  }

  return (
    <form className={`${pageStyles.card} ${styles.form}`} onSubmit={onSubmit}>
      <h2>Nuevo proyecto</h2>
      <label className={pageStyles.field}>
        Nombre
        <input
          className={pageStyles.input}
          value={name}
          maxLength={120}
          autoFocus
          required
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className={pageStyles.field}>
        Descripción (opcional)
        <input
          className={pageStyles.input}
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <fieldset className={styles.colors}>
        <legend>Color</legend>
        {PROJECT_COLORS.map((c) => (
          <label key={c.value} className={styles.colorOption} title={c.label}>
            <input
              type="radio"
              name="color"
              value={c.value}
              checked={color === c.value}
              onChange={() => setColor(c.value)}
              aria-label={c.label}
            />
            <span style={{ background: dotColor(c.value) }} />
          </label>
        ))}
      </fieldset>
      {createProject.isError && (
        <p className={pageStyles.error} role="alert">
          No se pudo crear el proyecto. Revisa el nombre e inténtalo de nuevo.
        </p>
      )}
      <div className={styles.formActions}>
        <button type="submit" className={pageStyles.primary} disabled={!name.trim() || createProject.isPending}>
          <Icon name="plus" size={18} /> Crear proyecto
        </button>
        <button type="button" className={pageStyles.secondary} onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
