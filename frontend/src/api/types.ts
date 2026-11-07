/** Shapes returned by the Laravel API (see backend/app/Http/Resources). */

export type Priority = 1 | 2 | 3

export type ProjectColor = 'orange' | 'blue' | 'teal' | 'violet' | 'pink' | 'green' | 'amber' | 'slate'

export type Role = 'owner' | 'admin' | 'member' | 'guest'

export interface Member {
  id: number
  name: string
  email?: string
  role?: Role
  joined_at?: string
}

export interface Invitation {
  id: number
  email: string
  role: Exclude<Role, 'owner'>
  inviter: { id: number; name: string } | null
  expires_at: string
  expired: boolean
  /** Only right after creating or renewing it. */
  link: string | null
  created_at: string
}

/** What the invitation page shows before signing in. */
export interface InvitationInfo {
  workspace: string
  inviter: string | null
  email: string
  role: Exclude<Role, 'owner'>
  expired: boolean
  accepted: boolean
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

export interface Attachment {
  id: number
  name: string
  mime: string
  size: number
  is_image: boolean
  url: string
}

export interface Comment {
  id: number
  body: string
  attachments?: Attachment[]
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
  /** Minutes logged with the timer or by hand. */
  tracked_minutes?: number
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

export interface TimeEntry {
  id: number
  task_id: number
  started_at: string
  ended_at: string | null
  minutes: number
  running: boolean
  note: string | null
  user?: { id: number; name: string }
  task?: { id: number; title: string; project: { name: string; color: ProjectColor } | null }
  can_delete: boolean
}

export interface AppNotification {
  id: string
  kind: 'reminder' | 'due_soon' | 'assigned' | 'commented'
  task_id: number
  title: string
  body: string
  read_at: string | null
  created_at: string
}

export interface Reminder {
  id: number
  remind_at: string
  /** Minutes before the due date (follows it), or null for a fixed moment. */
  offset_minutes: number | null
  sent: boolean
}

/** Team workload: one row per member. */
export interface Workload {
  user: { id: number; name: string }
  role: Role
  open: number
  overdue: number
  this_week: number
  done_since: number
  minutes_since: number
}

export type GoalHealth = 'done' | 'late' | 'at_risk' | 'on_track' | 'no_dates'

export interface KeyResult {
  id: number
  goal_id: number
  title: string
  kind: 'number' | 'tasks'
  start_value: number
  target_value: number
  current_value: number
  unit: string | null
  project: { id: number; name: string; color: ProjectColor } | null
  tasks: { done: number; total: number } | null
  /** 0–100 */
  progress: number
}

export interface Goal {
  id: number
  title: string
  description: string | null
  color: ProjectColor
  owner: { id: number; name: string } | null
  /** YYYY-MM-DD */
  start_date: string | null
  due_date: string | null
  closed: boolean
  /** 0–100, the average of its key results. */
  progress: number
  health: GoalHealth
  key_results: KeyResult[]
  created_at: string
}

export interface GoalInput {
  title?: string
  description?: string | null
  color?: ProjectColor
  owner_id?: number | null
  start_date?: string | null
  due_date?: string | null
  closed?: boolean
}

export interface KeyResultInput {
  title?: string
  kind?: KeyResult['kind']
  start_value?: number
  target_value?: number
  current_value?: number
  unit?: string | null
  project_id?: number | null
}

/** Home "Actividad": my tasks and time today and this week. */
export interface Summary {
  done_today: number
  pending_today: number
  done_week: number
  pending_week: number
  overdue: number
  minutes_today: number
  minutes_week: number
}

type ProjectRef = { id: number; name: string; color: ProjectColor }

/** Extra home cards (GET workspaces/{ws}/insights). */
export interface Insights {
  /** When each of my tasks was finished since `since` (ISO). */
  completed: string[]
  /** My logged minutes this week, per project (null = no project). */
  time_by_project: { project: ProjectRef | null; minutes: number }[]
  /** My open tasks with no movement in `stale_days` days (oldest first, up to 6). */
  stale: { id: number; title: string; project: ProjectRef | null; due_at: string | null; updated_at: string }[]
  stale_count: number
  stale_days: number
  /** Latest comments other people left on my tasks. */
  comments: { id: number; excerpt: string; author: { id: number; name: string } | null; task: { id: number; title: string }; created_at: string }[]
}
