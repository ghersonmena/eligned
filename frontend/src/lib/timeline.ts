import type { ProjectColor, Task, TaskInput } from '../api/types'
import { addDays, daysBetween, dueAtEndOf, shiftDays, startOfDay, startOfWeek } from './dates'

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

/* ---------- Scales: Día (hours), Semana (days), Mes (weeks) ---------- */

export type Scale = 'dia' | 'semana' | 'mes'

/** Narrowest columns before the chart scrolls sideways. */
const MIN_HOUR_WIDTH = 48
const MIN_WEEK_DAY_WIDTH = 90
const MIN_MONTH_DAY_WIDTH = 18

/** Horizontal geometry of the timeline for one window of time. */
export interface Axis {
  /** First day shown (local midnight). */
  start: Date
  days: number
  dayWidth: number
  width: number
  /** Día: things sit at their exact time. Semana/Mes: they snap to whole days. */
  exact: boolean
  /** Px per drag step (an hour on Día, a day otherwise). */
  stepWidth: number
}

export function axisFrom(start: Date, days: number, dayWidth: number, exact = false): Axis {
  return { start: startOfDay(start), days, dayWidth, width: days * dayWidth, exact, stepWidth: exact ? dayWidth / 24 : dayWidth }
}

/**
 * Window around `anchor`:
 * - dia: that day, 24 hour columns.
 * - semana: Monday to Sunday, one column per day.
 * - mes: the weeks (Monday to Sunday) that touch the month, one column per week.
 * Columns stretch to fill `available` px, down to a minimum width.
 */
export function makeAxis(scale: Scale, anchor: Date, available = 0): Axis {
  if (scale === 'dia') return axisFrom(anchor, 1, Math.max(MIN_HOUR_WIDTH, Math.floor(available / 24)) * 24, true)
  if (scale === 'semana') return axisFrom(startOfWeek(anchor), 7, Math.max(MIN_WEEK_DAY_WIDTH, Math.floor(available / 7)))
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const start = startOfWeek(first)
  const days = daysBetween(start, startOfWeek(last)) + 7
  return axisFrom(start, days, Math.max(MIN_MONTH_DAY_WIDTH, Math.floor(available / days)))
}

/** Same scale, one window earlier (-1) or later (+1). */
export function shiftAnchor(scale: Scale, anchor: Date, direction: number): Date {
  if (scale === 'dia') return addDays(anchor, direction)
  if (scale === 'semana') return addDays(anchor, 7 * direction)
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
}

/** Px from the left edge for an instant. */
export function xOf(axis: Axis, date: Date): number {
  const day = startOfDay(date)
  const fraction = (date.getTime() - day.getTime()) / 86_400_000
  return (daysBetween(axis.start, day) + fraction) * axis.dayWidth
}

/** Where a single moment is drawn: its exact time on Día, the middle of its day otherwise. */
export function pointOf(axis: Axis, date: Date): number {
  return axis.exact ? xOf(axis, date) : xOf(axis, startOfDay(date)) + axis.dayWidth / 2
}

/**
 * Left and right edges (px) of a task bar, or `point` for a task drawn as a
 * diamond (only a due date). Null without dates.
 */
export function taskExtent(task: Task, axis: Axis): { left: number; right: number } | null {
  const span = taskSpan(task)
  if (!span) return null
  if (!axis.exact) return { left: xOf(axis, span.start), right: xOf(axis, addDays(span.end, 1)) }
  const a = new Date(task.start_at ?? task.due_at!)
  const b = new Date(task.due_at ?? task.start_at!)
  return a <= b ? { left: xOf(axis, a), right: xOf(axis, b) } : { left: xOf(axis, b), right: xOf(axis, a) }
}

/**
 * Dates after dragging a bar `hours` hours (Día scale). Moving shifts both
 * dates; a side can't cross the other one. Null when nothing changes.
 */
export function datesAfterHourDrag(task: Task, mode: DragMode, hours: number): TaskInput | null {
  if (hours === 0 || (!task.start_at && !task.due_at)) return null
  const shift = (iso: string) => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString()
  if (mode === 'move' || !task.start_at || !task.due_at) {
    return {
      ...(task.start_at ? { start_at: shift(task.start_at) } : {}),
      ...(task.due_at ? { due_at: shift(task.due_at) } : {}),
    }
  }
  if (mode === 'start') {
    const next = shift(task.start_at)
    return next < task.due_at ? { start_at: next } : null
  }
  const next = shift(task.due_at)
  return next > task.start_at ? { due_at: next } : null
}

export interface CompletionMarks {
  /** Center of the due-date diamond, in px from the window start (null without a due date). */
  dueX: number | null
  /** Center of the "finished" diamond. */
  doneX: number
  /** Finished after its due date. */
  late: boolean
}

/**
 * Where to draw, on a completed task's row, the diamond of its due date and the
 * one of when it was really finished (at the exact time on Día, in the middle
 * of the day otherwise). When both land on the same spot the finished one
 * moves a bit left (early) or right (late) so both stay visible. Null for open
 * tasks.
 */
export function completionMarks(task: Pick<Task, 'due_at' | 'completed_at'>, axis: Axis): CompletionMarks | null {
  if (!task.completed_at) return null
  const done = new Date(task.completed_at)
  const doneX = pointOf(axis, done)
  if (!task.due_at) return { dueX: null, doneX, late: false }

  const due = new Date(task.due_at)
  const late = done.getTime() > due.getTime()
  const dueX = pointOf(axis, due)
  const nudge = Math.max(12, Math.min(axis.dayWidth * 0.4, 24))
  return { dueX, doneX: doneX === dueX ? doneX + (late ? nudge : -nudge) : doneX, late }
}
