import type { Priority, Task, TaskInput } from '../api/types'
import { fromInputs, toDateInput, toTimeInput } from './dates'

/** What the task form edits (strings for <select>/<input> values). */
export interface TaskFormValues {
  title: string
  description: string
  priority: Priority
  statusId: string
  projectId: string
  dueDate: string
  dueTime: string
  assigneeIds: number[]
}

export function emptyTaskValues(overrides: Partial<TaskFormValues> = {}): TaskFormValues {
  return {
    title: '',
    description: '',
    priority: 2,
    statusId: '',
    projectId: '',
    dueDate: '',
    dueTime: '',
    assigneeIds: [],
    ...overrides,
  }
}

export function valuesFromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    statusId: String(task.status_id),
    projectId: task.project_id ? String(task.project_id) : '',
    dueDate: toDateInput(task.due_at),
    dueTime: toTimeInput(task.due_at),
    assigneeIds: task.assignees?.map((a) => a.id) ?? [],
  }
}

/** @param includeProject false for subtasks, which always follow their parent's project. */
export function toTaskInput(values: TaskFormValues, includeProject = true): TaskInput {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    priority: values.priority,
    ...(values.statusId ? { status_id: Number(values.statusId) } : {}),
    ...(includeProject ? { project_id: values.projectId ? Number(values.projectId) : null } : {}),
    due_at: fromInputs(values.dueDate, values.dueTime),
    assignee_ids: values.assigneeIds,
  }
}
