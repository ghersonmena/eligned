import type { ProjectColor, Task, TaskInput } from '../api/types'
import { addDays, daysBetween, dueAtEndOf, shiftDays, startOfDay } from './dates'

/** First and last day (local) a task covers on the timeline, or null without dates. */
export function taskSpan(task: Task): { start: Date; end: Date } | null {
  const startIso = task.start_at ?? task.due_at
  const endIso = task.due_at ?? task.start_at
  if (!startIso || !endIso) return null
  const start = startOfDay(new Date(startIso))
  const end = startOfDay(new Date(endIso))
  return end < start ? { start: end, end: start } : { start, end }
}

export type DragMode = 'move' | 'start' | 'end'

/**
 * Dates to save after dragging a bar `delta` days.
 * - move: shifts both dates.
 * - start/end: resizes one side (never past the other one).
 * Returns null when nothing changes.
 */
export function datesAfterDrag(task: Task, mode: DragMode, delta: number): TaskInput | null {
  const span = taskSpan(task)
  if (!span || delta === 0) return null

  // A start-only task has a single day: moving its start moves it.
  if (mode === 'move' || (mode === 'start' && !task.due_at)) {
    return {
      ...(task.start_at ? { start_at: shiftDays(task.start_at, delta) } : {}),
      ...(task.due_at ? { due_at: shiftDays(task.due_at, delta) } : {}),
    }
  }

  if (mode === 'start') {
    const length = daysBetween(span.start, span.end)
    const d = Math.min(delta, length)
    if (d === 0) return null
    return { start_at: addDays(span.start, d).toISOString() }
  }

  // mode === 'end'
  const length = daysBetween(span.start, span.end)
  const d = Math.max(delta, -length)
  if (d === 0) return null
  return { due_at: task.due_at ? shiftDays(task.due_at, d) : dueAtEndOf(addDays(span.end, d)) }
}

/**
 * A parent's dates when its subtasks have any: from the earliest subtask date
 * to the latest one (same rule as the server). Null when no subtask has dates.
 */
export function spanFromSubtasks(subtasks: Pick<Task, 'start_at' | 'due_at'>[]): { start_at: string; due_at: string } | null {
  const starts = subtasks.map((s) => s.start_at ?? s.due_at).filter((d): d is string => !!d)
  const ends = subtasks.map((s) => s.due_at ?? s.start_at).filter((d): d is string => !!d)
  if (!starts.length) return null
  const byTime = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime()
  return { start_at: starts.sort(byTime)[0], due_at: ends.sort(byTime).at(-1)! }
}

/** True when the task's dates are computed from its subtasks. */
export function datesFromSubtasks(task: Task): boolean {
  return !task.parent_id && !!task.subtasks && spanFromSubtasks(task.subtasks) !== null
}

/** A task with subtasks is completed (or reopened) only by closing its subtasks. */
export function closesWithSubtasks(task: Task): boolean {
  return !task.parent_id && (task.subtasks_count ?? task.subtasks?.length ?? 0) > 0
}

/** 0–100: completed tasks are full; otherwise the share of finished subtasks. */
export function taskProgress(task: Task): number {
  if (task.completed) return 100
  const total = task.subtasks_count ?? task.subtasks?.length ?? 0
  const done = task.subtasks_done_count ?? task.subtasks?.filter((s) => s.completed).length ?? 0
  return total ? Math.round((done / total) * 100) : 0
}

export interface ProjectSpan {
  id: number
  name: string
  color: ProjectColor
  start: Date
  end: Date
}

/**
 * The days each project covers: from the first to the last day of any of its
 * tasks or subtasks. Sorted by start, then name.
 */
export function projectSpans(tasks: Task[]): ProjectSpan[] {
  const map = new Map<number, ProjectSpan>()
  tasks.forEach((task) => {
    const span = taskSpan(task)
    if (!span || !task.project) return
    const current = map.get(task.project.id)
    if (!current) {
      map.set(task.project.id, { ...task.project, ...span })
      return
    }
    if (span.start < current.start) current.start = span.start
    if (span.end > current.end) current.end = span.end
  })
  return [...map.values()].sort((a, b) => a.start.getTime() - b.start.getTime() || a.name.localeCompare(b.name))
}
