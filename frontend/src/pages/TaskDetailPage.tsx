import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Priority, Task, TaskInput } from '../api/types'
import { Icon } from '../components/Icon'
import { CompleteCheckbox } from '../components/tasks/TaskRow'
import { useMe } from '../hooks/useAuth'
import {
  useAddComment,
  useCreateSubtask,
  useDeleteComment,
  useDeleteTask,
  useMembers,
  useProjects,
  useStatuses,
  useTask,
  useUpdateTask,
} from '../hooks/useWorkspaceData'
import { chipStyle, PRIORITIES } from '../lib/colors'
import { fromInputs, toDateInput, toTimeInput } from '../lib/dates'
import { initials } from '../lib/initials'
import styles from './detail.module.css'
import pageStyles from './pages.module.css'

const commentDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function TaskDetailPage() {
  const { id } = useParams()
  const taskId = Number(id)
  const { data: task, isPending, isError } = useTask(taskId)

  if (isPending) return <p className={pageStyles.eyebrow}>Cargando tarea…</p>
  if (isError || !task) {
    return (
      <section className={pageStyles.card}>
        <h2>No encontramos esta tarea</h2>
        <p>Puede que se haya eliminado o que no tengas acceso.</p>
        <Link to="/tareas">Volver a mis tareas</Link>
      </section>
    )
  }
  // key: reset local form state when navigating between tasks.
  return <TaskDetail key={task.id} task={task} />
}

function TaskDetail({ task }: { task: Task }) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: statuses = [] } = useStatuses()
  const { data: projects = [] } = useProjects()
  const { data: members = [] } = useMembers()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate] = useState(toDateInput(task.due_at))
  const [dueTime, setDueTime] = useState(toTimeInput(task.due_at))

  const save = (input: TaskInput) => updateTask.mutate({ id: task.id, input })
  const assigneeIds = task.assignees?.map((a) => a.id) ?? []

  function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed) return setTitle(task.title)
    if (trimmed !== task.title) save({ title: trimmed })
  }

  function saveDue(date: string, time: string) {
    setDueDate(date)
    setDueTime(time)
    save({ due_at: fromInputs(date, time) })
  }

  function toggleAssignee(memberId: number) {
    const next = assigneeIds.includes(memberId)
      ? assigneeIds.filter((a) => a !== memberId)
      : [...assigneeIds, memberId]
    save({ assignee_ids: next })
  }

  function remove() {
    if (!window.confirm(`¿Eliminar "${task.title}"${task.subtasks_count ? ' y sus subtareas' : ''}? No se puede deshacer.`)) return
    deleteTask.mutate(task.id, { onSuccess: () => navigate(task.parent_id ? `/tareas/${task.parent_id}` : '/tareas') })
  }

  return (
    <div className={styles.layout}>
      <nav aria-label="Ruta" className={styles.breadcrumb}>
        <Link to="/tareas">Mis tareas</Link>
        {task.project && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/proyectos/${task.project.id}`}>{task.project.name}</Link>
          </>
        )}
        {task.parent_id && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/tareas/${task.parent_id}`}>Tarea principal</Link>
          </>
        )}
      </nav>

      <section className={pageStyles.card}>
        <div className={styles.titleRow}>
          <CompleteCheckbox task={task} className={styles.bigCheck} />
          <label className="visually-hidden" htmlFor="task-title">
            Título
          </label>
          <input
            id="task-title"
            className={`${styles.titleInput} ${task.completed ? styles.titleDone : ''}`}
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>

        <div className={styles.fields}>
          <label className={styles.field}>
            Estado
            <select value={task.status_id} onChange={(e) => save({ status_id: Number(e.target.value) })}>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Prioridad
            <select value={task.priority} onChange={(e) => save({ priority: Number(e.target.value) as Priority })}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {!task.parent_id && (
            <label className={styles.field}>
              Proyecto
              <select
                value={task.project_id ?? ''}
                onChange={(e) => save({ project_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.field}>
            <span id="due-label">Fecha límite</span>
            <div className={styles.dueInputs} role="group" aria-labelledby="due-label">
              <input
                type="date"
                aria-label="Día"
                value={dueDate}
                onChange={(e) => saveDue(e.target.value, e.target.value ? dueTime : '')}
              />
              <input
                type="time"
                aria-label="Hora (opcional)"
                value={dueTime}
                disabled={!dueDate}
                onChange={(e) => saveDue(dueDate, e.target.value)}
              />
              {dueDate && (
                <button type="button" className={styles.iconButton} aria-label="Quitar fecha" onClick={() => saveDue('', '')}>
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <fieldset className={styles.assignees}>
          <legend>Responsables</legend>
          {members.map((m) => (
            <label key={m.id} className={styles.assignee}>
              <input type="checkbox" checked={assigneeIds.includes(m.id)} onChange={() => toggleAssignee(m.id)} />
              <span className={styles.avatar} aria-hidden="true">
                {initials(m.name)}
              </span>
              {m.name}
            </label>
          ))}
        </fieldset>

        <label className={styles.field}>
          Descripción
          <textarea
            rows={4}
            placeholder="Agrega detalles, pasos o enlaces…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (task.description ?? '') && save({ description: description || null })}
          />
        </label>

        {updateTask.isError && (
          <p className={pageStyles.error} role="alert">
            No se pudo guardar el último cambio. Inténtalo de nuevo.
          </p>
        )}
      </section>

      {!task.parent_id && <Subtasks task={task} />}
      <Comments task={task} />

      <div>
        <button type="button" className={styles.danger} onClick={remove} disabled={deleteTask.isPending}>
          <Icon name="trash" size={18} />
          Eliminar tarea
        </button>
      </div>
    </div>
  )
}

function Subtasks({ task }: { task: Task }) {
  const [title, setTitle] = useState('')
  const createSubtask = useCreateSubtask(task.id)
  const subtasks = task.subtasks ?? []
  const done = subtasks.filter((s) => s.completed).length

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed) createSubtask.mutate(trimmed, { onSuccess: () => setTitle('') })
  }

  return (
    <section className={pageStyles.card} aria-labelledby="subtasks-title">
      <div className={styles.sectionHeader}>
        <h2 id="subtasks-title">Subtareas</h2>
        {subtasks.length > 0 && (
          <>
            <span className={styles.progressLabel}>
              {done}/{subtasks.length}
            </span>
            <span className={styles.progress} aria-hidden="true">
              <span style={{ width: `${(done / subtasks.length) * 100}%` }} />
            </span>
          </>
        )}
      </div>
      <ul className={styles.subtasks}>
        {subtasks.map((s) => (
          <li key={s.id} className={styles.subtask}>
            <CompleteCheckbox task={s} />
            <Link to={`/tareas/${s.id}`} className={s.completed ? styles.subtaskDone : undefined}>
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
      <form className={styles.inlineForm} onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="new-subtask">
          Nueva subtarea
        </label>
        <input
          id="new-subtask"
          placeholder="Agregar subtarea y pulsar Enter"
          value={title}
          maxLength={255}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" disabled={!title.trim() || createSubtask.isPending}>
          Agregar
        </button>
      </form>
    </section>
  )
}

function Comments({ task }: { task: Task }) {
  const { data: user } = useMe()
  const [body, setBody] = useState('')
  const addComment = useAddComment(task.id)
  const deleteComment = useDeleteComment(task.id)
  const comments = task.comments ?? []

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()
    if (trimmed) addComment.mutate(trimmed, { onSuccess: () => setBody('') })
  }

  return (
    <section className={pageStyles.card} aria-labelledby="comments-title">
      <h2 id="comments-title">Comentarios</h2>
      {comments.length === 0 && <p>Todavía no hay comentarios.</p>}
      <ul className={styles.comments}>
        {comments.map((c) => (
          <li key={c.id} className={styles.comment}>
            <span className={styles.avatar} aria-hidden="true">
              {c.author ? initials(c.author.name) : '?'}
            </span>
            <div className={styles.commentBody}>
              <span className={styles.commentMeta}>
                <strong>{c.author?.id === user?.id ? 'Tú' : (c.author?.name ?? 'Usuario eliminado')}</strong> ·{' '}
                {commentDate.format(new Date(c.created_at))}
              </span>
              <p>{c.body}</p>
            </div>
            {c.can_delete && (
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Eliminar comentario"
                onClick={() => window.confirm('¿Eliminar este comentario?') && deleteComment.mutate(c.id)}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form className={styles.inlineForm} onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="new-comment">
          Escribe un comentario
        </label>
        <textarea
          id="new-comment"
          rows={2}
          placeholder="Escribe un comentario…"
          value={body}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" disabled={!body.trim() || addComment.isPending}>
          Enviar
        </button>
      </form>
      {task.project && (
        <p className={styles.footnote}>
          Proyecto:{' '}
          <span className={styles.chip} style={chipStyle(task.project.color)}>
            {task.project.name}
          </span>
        </p>
      )}
    </section>
  )
}
