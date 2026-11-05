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
} from './types'

interface Wrapped<T> {
  data: T
}

const unwrap = <T>(r: Wrapped<T>) => r.data

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
    api<Wrapped<Project>>('POST', `/workspaces/${workspaceId}/projects`, input).then(unwrap),
  updateProject: (id: number, input: ProjectInput) =>
    api<Wrapped<Project>>('PATCH', `/projects/${id}`, input).then(unwrap),
  deleteProject: (id: number) => api<void>('DELETE', `/projects/${id}`),

  tasks: (workspaceId: number, filters: TaskFilters = {}) =>
    api<Wrapped<Task[]>>('GET', `/workspaces/${workspaceId}/tasks${query(filters)}`).then(unwrap),
  task: (id: number) => api<Wrapped<Task>>('GET', `/tasks/${id}`).then(unwrap),
  createTask: (workspaceId: number, input: TaskInput) =>
    api<Wrapped<Task>>('POST', `/workspaces/${workspaceId}/tasks`, input).then(unwrap),
  updateTask: (id: number, input: TaskInput) => api<Wrapped<Task>>('PATCH', `/tasks/${id}`, input).then(unwrap),
  moveTask: (id: number, statusId: number, position: number) =>
    api<Wrapped<Task>>('POST', `/tasks/${id}/move`, { status_id: statusId, position }).then(unwrap),
  deleteTask: (id: number) => api<void>('DELETE', `/tasks/${id}`),
  createSubtask: (taskId: number, input: TaskInput) =>
    api<Wrapped<Task>>('POST', `/tasks/${taskId}/subtasks`, input).then(unwrap),

  taskActivity: (id: number) => api<Wrapped<Activity[]>>('GET', `/tasks/${id}/activity`).then(unwrap),

  timer: (since: string) =>
    api<{ data: TimeEntry | null; today_minutes: number }>('GET', `/timer?since=${encodeURIComponent(since)}`),
  startTimer: (taskId: number) => api<Wrapped<TimeEntry>>('POST', `/tasks/${taskId}/timer`).then(unwrap),
  stopTimer: () => api<{ data: TimeEntry | null }>('POST', '/timer/stop').then((r) => r.data),
  timeEntries: (taskId: number) =>
    api<{ data: TimeEntry[]; total_minutes: number }>('GET', `/tasks/${taskId}/time-entries`),
  addTimeEntry: (taskId: number, input: { started_at: string; minutes: number; note: string | null }) =>
    api<Wrapped<TimeEntry>>('POST', `/tasks/${taskId}/time-entries`, input).then(unwrap),
  deleteTimeEntry: (id: number) => api<void>('DELETE', `/time-entries/${id}`),

  addComment: (taskId: number, body: string) =>
    api<Wrapped<Comment>>('POST', `/tasks/${taskId}/comments`, { body }).then(unwrap),
  deleteComment: (id: number) => api<void>('DELETE', `/comments/${id}`),
}
