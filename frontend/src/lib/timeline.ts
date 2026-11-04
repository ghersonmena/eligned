import type { Task, TaskInput } from '../api/types'
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

/** 0–100: completed tasks are full; otherwise the share of finished subtasks. */
export function taskProgress(task: Task): number {
  if (task.completed) return 100
  const total = task.subtasks_count ?? task.subtasks?.length ?? 0
  const done = task.subtasks_done_count ?? task.subtasks?.filter((s) => s.completed).length ?? 0
  return total ? Math.round((done / total) * 100) : 0
}
