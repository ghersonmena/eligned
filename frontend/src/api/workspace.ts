import { upper, upperFields } from '../lib/text'
import { api } from './client'
import type {
  Activity,
  Comment,
  Member,
  Project,
  ProjectInput,
  Task,
  TaskFilters,
  TaskInput,
  TaskStatus,
  TimeEntry,
  AppNotification,
  Reminder,
} from './types'

interface Wrapped<T> {
  data: T
}

const unwrap = <T>(r: Wrapped<T>) => r.data

const TASK_TEXT = ['title', 'description'] as const
const PROJECT_TEXT = ['name', 'description'] as const
export const upperTask = (input: TaskInput) => upperFields(input, TASK_TEXT)
const upperProject = (input: ProjectInput) => upperFields(input, PROJECT_TEXT)

function query(filters: TaskFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value))
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const workspaceApi = {
  statuses: (workspaceId: number) =>
    api<Wrapped<TaskStatus[]>>('GET', `/workspaces/${workspaceId}/statuses`).then(unwrap),
  members: (workspaceId: number) => api<Wrapped<Member[]>>('GET', `/workspaces/${workspaceId}/members`).then(unwrap),

  projects: (workspaceId: number) => api<Wrapped<Project[]>>('GET', `/workspaces/${workspaceId}/projects`).then(unwrap),
  project: (id: number) => api<Wrapped<Project>>('GET', `/projects/${id}`).then(unwrap),
  createProject: (workspaceId: number, input: ProjectInput) =>
    api<Wrapped<Project>>('POST', `/workspaces/${workspaceId}/projects`, upperProject(input)).then(unwrap),
  updateProject: (id: number, input: ProjectInput) =>
    api<Wrapped<Project>>('PATCH', `/projects/${id}`, upperProject(input)).then(unwrap),
  deleteProject: (id: number) => api<void>('DELETE', `/projects/${id}`),

  tasks: (workspaceId: number, filters: TaskFilters = {}) =>
    api<Wrapped<Task[]>>('GET', `/workspaces/${workspaceId}/tasks${query(filters)}`).then(unwrap),
  task: (id: number) => api<Wrapped<Task>>('GET', `/tasks/${id}`).then(unwrap),
  createTask: (workspaceId: number, input: TaskInput) =>
    api<Wrapped<Task>>('POST', `/workspaces/${workspaceId}/tasks`, upperTask(input)).then(unwrap),
  updateTask: (id: number, input: TaskInput) => api<Wrapped<Task>>('PATCH', `/tasks/${id}`, upperTask(input)).then(unwrap),
  moveTask: (id: number, statusId: number, position: number) =>
    api<Wrapped<Task>>('POST', `/tasks/${id}/move`, { status_id: statusId, position }).then(unwrap),
  deleteTask: (id: number) => api<void>('DELETE', `/tasks/${id}`),
  createSubtask: (taskId: number, input: TaskInput) =>
    api<Wrapped<Task>>('POST', `/tasks/${taskId}/subtasks`, upperTask(input)).then(unwrap),

  taskActivity: (id: number) => api<Wrapped<Activity[]>>('GET', `/tasks/${id}/activity`).then(unwrap),

  notifications: () => api<{ data: AppNotification[]; unread_count: number }>('GET', '/notifications'),
  readNotification: (id: string) => api<void>('POST', `/notifications/${id}/read`),
  readAllNotifications: () => api<void>('POST', '/notifications/read-all'),
  reminders: (taskId: number) => api<Wrapped<Reminder[]>>('GET', `/tasks/${taskId}/reminders`).then(unwrap),
  addReminder: (taskId: number, input: { remind_at?: string; offset_minutes?: number }) =>
    api<Wrapped<Reminder>>('POST', `/tasks/${taskId}/reminders`, input).then(unwrap),
  deleteReminder: (id: number) => api<void>('DELETE', `/reminders/${id}`),

  /** Running timers (oldest first) and the minutes logged today. */
  timer: (since: string) =>
    api<{ data: TimeEntry[]; today_minutes: number }>('GET', `/timer?since=${encodeURIComponent(since)}`),
  startTimer: (taskId: number) => api<Wrapped<TimeEntry>>('POST', `/tasks/${taskId}/timer`).then(unwrap),
  /** Stops one task's timer, or all of them when no task is given. */
  stopTimer: (taskId?: number) =>
    api<Wrapped<TimeEntry[]>>('POST', '/timer/stop', taskId ? { task_id: taskId } : {}).then(unwrap),
  timeEntries: (taskId: number) =>
    api<{ data: TimeEntry[]; total_minutes: number }>('GET', `/tasks/${taskId}/time-entries`),
  addTimeEntry: (taskId: number, input: { started_at: string; minutes: number; note: string | null }) =>
    api<Wrapped<TimeEntry>>('POST', `/tasks/${taskId}/time-entries`, { ...input, note: upper(input.note) }).then(unwrap),
  deleteTimeEntry: (id: number) => api<void>('DELETE', `/time-entries/${id}`),

  /** Text and/or files (sent as multipart when there are files). */
  addComment: (taskId: number, body: string, files: File[] = []) => {
    if (files.length === 0) return api<Wrapped<Comment>>('POST', `/tasks/${taskId}/comments`, { body: upper(body) }).then(unwrap)
    const form = new FormData()
    form.append('body', upper(body))
    files.forEach((f) => form.append('attachments[]', f))
    return api<Wrapped<Comment>>('POST', `/tasks/${taskId}/comments`, form).then(unwrap)
  },
  deleteComment: (id: number) => api<void>('DELETE', `/comments/${id}`),
}
