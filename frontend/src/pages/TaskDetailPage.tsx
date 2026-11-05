import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Task } from '../api/types'
import { Icon } from '../components/Icon'
import { TaskForm } from '../components/tasks/TaskForm'
import { ActivityList } from '../components/tasks/ActivityList'
import { TimeSection } from '../components/time/TimeSection'
import { DoneStamp } from '../components/tasks/DoneStamp'
import { CompleteCheckbox } from '../components/tasks/TaskRow'
import { useMe } from '../hooks/useAuth'
import {
  useAddComment,
  useCreateSubtask,
  useDeleteComment,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from '../hooks/useWorkspaceData'
import { toTaskInput, valuesFromTask } from '../lib/taskForm'
import { closesWithSubtasks, datesFromSubtasks } from '../lib/timeline'
import { initials } from '../lib/initials'
import styles from './detail.module.css'
import pageStyles from './pages.module.css'

const commentDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function TaskDetailPage() {
  const { id } = useParams()
  const { data: task, isPending, isError } = useTask(Number(id))

  if (isPending) {
    return (
      <p className={styles.loading} role="status">
        <span className={styles.spinner} aria-hidden="true" /> Cargando tarea…
      </p>
    )
  }
  if (isError || !task) {
    return (
      <section className={pageStyles.card}>
        <h2>No encontramos esta tarea</h2>
        <p>Puede que se haya eliminado o que no tengas acceso.</p>
        <Link to="/tareas">Volver a mis tareas</Link>
      </section>
    )
  }
  return <TaskDetail key={task.id} task={task} />
}

function TaskDetail({ task }: { task: Task }) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const datesLocked = datesFromSubtasks(task)

  function remove() {
    const extra = task.subtasks_count ? ` y sus ${task.subtasks_count} subtareas` : ''
    if (!window.confirm(`¿Eliminar "${task.title}"${extra}? No se puede deshacer.`)) return
    deleteTask.mutate(task.id, {
      onSuccess: () => navigate(task.parent_id ? `/tareas/${task.parent_id}` : '/tareas', { replace: true }),
    })
  }

  return (
    <div className={styles.layout}>
      {deleteTask.isPending && (
        <div className={styles.overlay} role="status">
          <span className={styles.spinner} aria-hidden="true" /> Eliminando tarea…
        </div>
      )}

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

      <div className={styles.titleRow}>
        <CompleteCheckbox task={task} className={styles.bigCheck} />
        <h1 className={`${styles.title} ${task.completed ? styles.titleDone : ''}`}>{task.title}</h1>
      </div>
      {task.completed && (
        <p className={styles.doneLine}>
          <DoneStamp task={task} long />
        </p>
      )}
      {task.completed && task.subtasks_count ? (
        <p className={styles.autoNote}>Completada: todas sus subtareas están terminadas.</p>
      ) : null}

      <section className={pageStyles.card} aria-labelledby="edit-title">
        <h2 id="edit-title">Detalles</h2>
        <TaskForm
          // Remount when the status changes elsewhere (checkbox, subtasks) so the form never saves a stale status.
          // Also when the dates follow a subtask that was just moved.
          key={`${task.status_id}-${task.completed}-${datesLocked ? `${task.start_at}-${task.due_at}` : ''}`}
          initial={valuesFromTask(task)}
          submitLabel="Guardar cambios"
          showProject={!task.parent_id}
          datesLocked={datesLocked}
          completionLocked={closesWithSubtasks(task)}
          pending={updateTask.isPending}
          errorMessage={updateTask.isError ? 'No se pudieron guardar los cambios. Inténtalo de nuevo.' : undefined}
          onSubmit={(values) => {
            const input = toTaskInput(values, !task.parent_id)
            if (datesLocked) {
              delete input.start_at
              delete input.due_at
            }
            return updateTask.mutateAsync({ id: task.id, input })
          }}
        />
      </section>

      <TimeSection task={task} />
      {!task.parent_id && <Subtasks task={task} />}
      <Comments task={task} />
      <ActivityList taskId={task.id} />

      <div>
        <button type="button" className={styles.danger} onClick={remove} disabled={deleteTask.isPending}>
          <Icon name="trash" size={18} />
          Eliminar tarea
        </button>
        {deleteTask.isError && (
          <p className={pageStyles.error} role="alert">
            No se pudo eliminar la tarea. Inténtalo de nuevo.
          </p>
        )}
      </div>
    </div>
  )
}

function Subtasks({ task }: { task: Task }) {
  const [title, setTitle] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const createSubtask = useCreateSubtask(task.id)
  const deleteTask = useDeleteTask()
  const subtasks = task.subtasks ?? []
  const done = subtasks.filter((s) => s.completed).length

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed) createSubtask.mutate(trimmed, { onSuccess: () => setTitle('') })
  }

  function remove(subtask: Task) {
    if (!window.confirm(`¿Eliminar la subtarea "${subtask.title}"?`)) return
    setDeletingId(subtask.id)
    deleteTask.mutate(subtask.id, { onSettled: () => setDeletingId(null) })
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
      {subtasks.length > 0 && (
        <p className={styles.hintText}>Al terminar todas las subtareas, la tarea se completa sola.</p>
      )}
      <ul className={styles.subtasks}>
        {subtasks.map((s) => (
          <li key={s.id} className={`${styles.subtask} ${deletingId === s.id ? styles.removing : ''}`}>
            <CompleteCheckbox task={s} />
            <Link to={`/tareas/${s.id}`} className={s.completed ? styles.subtaskDone : undefined}>
              {s.title}
            </Link>
            <DoneStamp task={s} />
            {deletingId === s.id ? (
              <span className={styles.inlineStatus} role="status">
                <span className={styles.spinner} aria-hidden="true" /> Eliminando…
              </span>
            ) : (
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Eliminar subtarea "${s.title}"`}
                disabled={deletingId !== null}
                onClick={() => remove(s)}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form className={styles.inlineForm} onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="new-subtask">
          Nueva subtarea
        </label>
        <input
          id="new-subtask"
          placeholder="Nueva subtarea"
          value={title}
          maxLength={255}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" disabled={!title.trim() || createSubtask.isPending}>
          {createSubtask.isPending ? 'Agregando…' : 'Agregar subtarea'}
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
                disabled={deleteComment.isPending}
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
          {addComment.isPending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </section>
  )
}
