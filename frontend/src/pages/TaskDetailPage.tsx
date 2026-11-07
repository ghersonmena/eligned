import { useRef, useState, type ClipboardEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import type { Task } from '../api/types'
import { Icon } from '../components/Icon'
import { TaskForm } from '../components/tasks/TaskForm'
import { ActivityList } from '../components/tasks/ActivityList'
import { RemindersSection } from '../components/notifications/RemindersSection'
import { TimeSection } from '../components/time/TimeSection'
import { DoneStamp } from '../components/tasks/DoneStamp'
import { AttachmentList, PendingFiles } from '../components/tasks/Attachments'
import { ACCEPT, MAX_BYTES, MAX_FILES } from '../lib/attachments'
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
import { dateFormat, t } from '../lib/i18n'

const commentDate = { format: (d: Date) => dateFormat({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d) }

export function TaskDetailPage() {
  const { id } = useParams()
  const { data: task, isPending, isError } = useTask(Number(id))

  if (isPending) {
    return (
      <p className={styles.loading} role="status">
        <span className={styles.spinner} aria-hidden="true" /> {t('Cargando tarea…')}
      </p>
    )
  }
  if (isError || !task) {
    return (
      <section className={pageStyles.card}>
        <h2>{t('No encontramos esta tarea')}</h2>
        <p>{t('Puede que se haya eliminado o que no tengas acceso.')}</p>
        <Link to="/tareas">{t('Volver a mis tareas')}</Link>
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
    const question = task.subtasks_count
      ? t('¿Eliminar "{title}" y sus {n} subtareas? No se puede deshacer.', { title: task.title, n: task.subtasks_count })
      : t('¿Eliminar "{title}"? No se puede deshacer.', { title: task.title })
    if (!window.confirm(question)) return
    deleteTask.mutate(task.id, {
      onSuccess: () => navigate(task.parent_id ? `/tareas/${task.parent_id}` : '/tareas', { replace: true }),
    })
  }

  return (
    <div className={styles.layout}>
      {deleteTask.isPending && (
        <div className={styles.overlay} role="status">
          <span className={styles.spinner} aria-hidden="true" /> {t('Eliminando tarea…')}
        </div>
      )}

      <nav aria-label={t('Ruta')} className={styles.breadcrumb}>
        <Link to="/tareas">{t('Mis tareas')}</Link>
        {task.project && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/proyectos/${task.project.id}`}>{task.project.name}</Link>
          </>
        )}
        {task.parent_id && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/tareas/${task.parent_id}`}>{t('Tarea principal')}</Link>
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
        <p className={styles.autoNote}>{t('Completada: todas sus subtareas están terminadas.')}</p>
      ) : null}

      <section className={pageStyles.card} aria-labelledby="edit-title">
        <h2 id="edit-title">{t('Detalles')}</h2>
        <TaskForm
          // Remount when the status changes elsewhere (checkbox, subtasks) so the form never saves a stale status.
          // Also when the dates follow a subtask that was just moved.
          key={`${task.status_id}-${task.completed}-${datesLocked ? `${task.start_at}-${task.due_at}` : ''}`}
          initial={valuesFromTask(task)}
          submitLabel={t('Guardar cambios')}
          showProject={!task.parent_id}
          datesLocked={datesLocked}
          completionLocked={closesWithSubtasks(task)}
          pending={updateTask.isPending}
          errorMessage={updateTask.isError ? t('No se pudieron guardar los cambios. Inténtalo de nuevo.') : undefined}
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
      <RemindersSection task={task} />
      {!task.parent_id && <Subtasks task={task} />}
      <Comments task={task} />
      <ActivityList taskId={task.id} />

      <div>
        <button type="button" className={styles.danger} onClick={remove} disabled={deleteTask.isPending}>
          <Icon name="trash" size={18} />
          {t('Eliminar tarea')}
        </button>
        {deleteTask.isError && (
          <p className={pageStyles.error} role="alert">
            {t('No se pudo eliminar la tarea. Inténtalo de nuevo.')}
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
    if (!window.confirm(t('¿Eliminar la subtarea "{title}"?', { title: subtask.title }))) return
    setDeletingId(subtask.id)
    deleteTask.mutate(subtask.id, { onSettled: () => setDeletingId(null) })
  }

  return (
    <section className={pageStyles.card} aria-labelledby="subtasks-title">
      <div className={styles.sectionHeader}>
        <h2 id="subtasks-title">{t('Subtareas')}</h2>
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
        <p className={styles.hintText}>{t('Al terminar todas las subtareas, la tarea se completa sola.')}</p>
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
                <span className={styles.spinner} aria-hidden="true" /> {t('Eliminando…')}
              </span>
            ) : (
              <button
                type="button"
                className={styles.iconButton}
                aria-label={t('Eliminar subtarea "{title}"', { title: s.title })}
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
          {t('Nueva subtarea')}
        </label>
        <input
          id="new-subtask"
          placeholder={t('Nueva subtarea')}
          className="caps"
          autoCapitalize="characters"
          value={title}
          maxLength={255}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" disabled={!title.trim() || createSubtask.isPending}>
          {createSubtask.isPending ? t('Agregando…') : t('Agregar subtarea')}
        </button>
      </form>
    </section>
  )
}

function Comments({ task }: { task: Task }) {
  const { data: user } = useMe()
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const addComment = useAddComment(task.id)
  const deleteComment = useDeleteComment(task.id)
  const comments = task.comments ?? []
  const canSend = (body.trim() !== '' || files.length > 0) && !addComment.isPending

  function addFiles(list: FileList | File[]) {
    const incoming = [...list]
    const tooBig = incoming.filter((f) => f.size > MAX_BYTES)
    const ok = incoming.filter((f) => f.size <= MAX_BYTES)
    const next = [...files, ...ok].slice(0, MAX_FILES)
    setFiles(next)
    if (tooBig.length) setFileError(t('"{name}" pesa más de 10 MB.', { name: tooBig[0].name }))
    else if (files.length + ok.length > MAX_FILES) setFileError(t('Puedes adjuntar hasta {n} archivos por comentario.', { n: MAX_FILES }))
    else setFileError(null)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSend) return
    addComment.mutate(
      { body: body.trim(), files },
      {
        onSuccess: () => {
          setBody('')
          setFiles([])
          setFileError(null)
        },
      },
    )
  }

  // Images pasted into the comment box are attached.
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = [...event.clipboardData.files]
    if (pasted.length === 0) return
    event.preventDefault()
    addFiles(pasted)
  }

  const serverError = addComment.error instanceof ApiError ? Object.values(addComment.error.errors)[0]?.[0] ?? addComment.error.message : null

  return (
    <section className={pageStyles.card} aria-labelledby="comments-title">
      <h2 id="comments-title">{t('Comentarios')}</h2>
      {comments.length === 0 && <p>{t('Todavía no hay comentarios.')}</p>}
      <ul className={styles.comments}>
        {comments.map((c) => (
          <li key={c.id} className={styles.comment}>
            <span className={styles.avatar} aria-hidden="true">
              {c.author ? initials(c.author.name) : '?'}
            </span>
            <div className={styles.commentBody}>
              <span className={styles.commentMeta}>
                <strong>{c.author?.id === user?.id ? t('Tú') : (c.author?.name ?? t('Usuario eliminado'))}</strong> ·{' '}
                {commentDate.format(new Date(c.created_at))}
              </span>
              {c.body && <p>{c.body}</p>}
              {c.attachments && c.attachments.length > 0 && <AttachmentList items={c.attachments} />}
            </div>
            {c.can_delete && (
              <button
                type="button"
                className={styles.iconButton}
                aria-label={t('Eliminar comentario')}
                disabled={deleteComment.isPending}
                onClick={() => window.confirm(t('¿Eliminar este comentario y sus archivos?')) && deleteComment.mutate(c.id)}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <PendingFiles files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
      {(fileError || serverError) && (
        <p className={pageStyles.error} role="alert">
          {fileError ?? serverError}
        </p>
      )}
      <form className={styles.inlineForm} onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="new-comment">
          {t('Escribe un comentario')}
        </label>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className={styles.attachButton}
          aria-label={t('Adjuntar fotos o archivos')}
          title={t('Adjuntar fotos o archivos')}
          disabled={files.length >= MAX_FILES}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="clip" size={20} />
        </button>
        <textarea
          id="new-comment"
          rows={2}
          className="caps"
          autoCapitalize="characters"
          placeholder={t('Escribe un comentario o pega una imagen…')}
          value={body}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
          onPaste={onPaste}
        />
        <button type="submit" disabled={!canSend}>
          {addComment.isPending ? (files.length ? t('Subiendo…') : t('Enviando…')) : t('Enviar')}
        </button>
      </form>
    </section>
  )
}
