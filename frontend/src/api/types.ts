/** Shapes returned by the Laravel API (see backend/app/Http/Resources). */

export type Priority = 1 | 2 | 3

export type ProjectColor = 'orange' | 'blue' | 'teal' | 'violet' | 'pink' | 'green' | 'amber' | 'slate'

export interface Member {
  id: number
  name: string
  role?: 'owner' | 'admin' | 'member' | 'guest'
}

export interface TaskStatus {
  id: number
  name: string
  color: ProjectColor
  position: number
  is_done: boolean
}

export interface Project {
  id: number
  name: string
  description: string | null
  color: ProjectColor
  archived: boolean
  open_tasks_count?: number
  done_tasks_count?: number
  created_at: string
}

export interface Comment {
  id: number
  body: string
  author: { id: number; name: string } | null
  can_delete: boolean
  created_at: string
}

export interface Task {
  id: number
  title: string
  description: string | null
  priority: Priority
  status_id: number
  project_id: number | null
  parent_id: number | null
  start_at: string | null
  due_at: string | null
  completed: boolean
  completed_at: string | null
  /** Order inside the parent task (subtasks) or in lists. */
  position: number
  /** Order inside its Kanban column. */
  board_position?: number
  /** Only in lists asked for with_subtasks: the subtask's parent. */
  parent?: { id: number; title: string } | null
  project?: { id: number; name: string; color: ProjectColor } | null
  assignees?: Member[]
  subtasks_count?: number
  subtasks_done_count?: number
  comments_count?: number
  subtasks?: Task[]
  comments?: Comment[]
  created_at: string
}

export interface TaskInput {
  title?: string
  description?: string | null
  priority?: Priority
  start_at?: string | null
  due_at?: string | null
  project_id?: number | null
  status_id?: number
  completed?: boolean
  assignee_ids?: number[]
}

export interface TaskFilters {
  status?: 'open' | 'completed' | 'all'
  project_id?: number
  assignee?: 'me'
  /** Kanban order instead of due date. */
  sort?: 'due' | 'position'
  /** With status=all: leaves out tasks completed before this date. */
  done_since?: string
  /** 1: subtasks come as rows of their own too (board, calendar). */
  with_subtasks?: 1
  /** Date range (ISO): tasks whose start..due span touches it. */
  from?: string
  to?: string
}

export interface ProjectInput {
  name?: string
  description?: string | null
  color?: ProjectColor
  archived?: boolean
}

export interface Activity {
  id: number
  event: 'created' | 'updated' | 'deleted' | 'commented' | 'subtask_added' | 'assigned' | 'time_logged'
  task_id: number | null
  subject: string | null
  /** updated: field => [from, to] (description: null), plus reason; other events: their details. */
  changes: Record<string, unknown> | null
  user: { id: number; name: string } | null
  created_at: string
}
