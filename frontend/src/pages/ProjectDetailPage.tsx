import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Icon } from '../components/Icon'
import { TaskGroups, TaskList } from '../components/tasks/TaskGroups'
import taskStyles from '../components/tasks/tasks.module.css'
import { useDeleteProject, useProject, useTasks, useUpdateProject } from '../hooks/useWorkspaceData'
import { chipStyle } from '../lib/colors'
import { ProjectForm } from './ProjectsPage'
import styles from './projects.module.css'
import pageStyles from './pages.module.css'
import { t } from '../lib/i18n'

export function ProjectDetailPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const navigate = useNavigate()
  const { data: project, isPending, isError } = useProject(projectId)
  const open = useTasks({ project_id: projectId, status: 'open' })
  const [showCompleted, setShowCompleted] = useState(false)
  const [editing, setEditing] = useState(false)
  const completed = useTasks({ project_id: projectId, status: 'completed' }, showCompleted)
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  if (isPending) return <p className={pageStyles.eyebrow}>{t('Cargando proyecto…')}</p>
  if (isError || !project) {
    return (
      <section className={pageStyles.card}>
        <h2>{t('No encontramos este proyecto')}</h2>
        <Link to="/proyectos">{t('Volver a Proyectos / Etiquetas')}</Link>
      </section>
    )
  }

  function remove() {
    if (!project) return
    if (!window.confirm(t('¿Eliminar el proyecto "{name}"? Sus tareas se conservan, solo quedan sin proyecto.', { name: project.name }))) return
    deleteProject.mutate(project.id, { onSuccess: () => navigate('/proyectos') })
  }

  const tasks = open.data ?? []

  return (
    <>
      <nav aria-label={t('Ruta')} className={styles.breadcrumb}>
        <Link to="/proyectos">{t('Proyectos / Etiquetas')}</Link>
      </nav>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.badge} style={chipStyle(project.color)} aria-hidden="true">
            {project.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className={pageStyles.pageTitle}>{project.name}</h1>
            {project.description && <p className={styles.description}>{project.description}</p>}
          </div>
        </div>
        <div className={styles.formActions}>
          {!editing && (
            <button type="button" className={pageStyles.secondary} onClick={() => setEditing(true)}>
              <Icon name="edit" size={18} /> {t('Editar')}
            </button>
          )}
          <button
            type="button"
            className={pageStyles.secondary}
            onClick={() => updateProject.mutate({ id: project.id, input: { archived: !project.archived } })}
          >
            <Icon name="archive" size={18} /> {project.archived ? t('Restaurar') : t('Archivar')}
          </button>
          <button type="button" className={pageStyles.secondary} onClick={remove}>
            <Icon name="trash" size={18} /> {t('Eliminar')}
          </button>
        </div>
      </div>

      {editing && <ProjectForm key={project.id} project={project} onDone={() => setEditing(false)} />}

      {project.archived && (
        <p className={styles.archivedNote} role="status">
          {t('Este proyecto está archivado: no aparece en la lista ni en los filtros.')}
        </p>
      )}

      <div>
        <Link to={`/tareas/nueva?proyecto=${project.id}`} className={`${pageStyles.primary} ${pageStyles.buttonLink} ${styles.inlineButton}`}>
          + {t('Nueva tarea en este proyecto')}
        </Link>
      </div>

      {open.isSuccess && tasks.length === 0 && (
        <div className={taskStyles.empty}>
          <strong>{t('Sin tareas pendientes')}</strong>
          <span>{t('Crea la primera tarea de este proyecto con el botón de arriba.')}</span>
        </div>
      )}

      <TaskGroups tasks={tasks} showProject={false} />

      <label className={taskStyles.toggle}>
        <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
        {t('Ver completadas')}
      </label>
      {showCompleted && completed.data && completed.data.length > 0 && (
        <TaskList title={t('Completadas')} tasks={completed.data} showProject={false} />
      )}
    </>
  )
}
