/**
 * Due dates.
 *
 * A task can be due on a day ("todo el día") or at a time. Day-only dates are
 * stored as 23:59 local time, so they sort after timed tasks of the same day
 * and count as overdue only once the day is over.
 */

const DAY_END_HOURS = 23
const DAY_END_MINUTES = 59

export type DueGroup = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none'

export const GROUP_LABELS: Record<DueGroup, string> = {
  overdue: 'Atrasadas',
  today: 'Hoy',
  tomorrow: 'Mañana',
  week: 'Próximos 7 días',
  later: 'Más adelante',
  none: 'Sin fecha',
}

export const GROUP_ORDER: DueGroup[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none']

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

export function isAllDay(date: Date): boolean {
  return date.getHours() === DAY_END_HOURS && date.getMinutes() === DAY_END_MINUTES
}

export function dueGroup(dueAt: string | null, now = new Date()): DueGroup {
  if (!dueAt) return 'none'
  const due = new Date(dueAt)
  if (due.getTime() < now.getTime()) return 'overdue'
  const days = daysBetween(now, due)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 7) return 'week'
  return 'later'
}

const weekdayShort = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' })
const dayMonth = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
const time = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })

/** "Hoy", "Mañana 10:00", "Ayer", "lun 3 nov", "5 ene 2027"… */
export function formatDue(dueAt: string, now = new Date()): string {
  const due = new Date(dueAt)
  const days = daysBetween(now, due)
  const clock = isAllDay(due) ? '' : ` ${time.format(due)}`

  if (days === 0) return `Hoy${clock}`
  if (days === 1) return `Mañana${clock}`
  if (days === -1) return `Ayer${clock}`
  if (Math.abs(days) <= 7) return `${weekdayShort.format(due)}${clock}`
  return `${dayMonth.format(due)}${clock}`
}

/** When a task was finished, always with the time: "Hoy 14:32", "Ayer 09:10", "lun, 3 nov 18:00"… */
export function formatDone(completedAt: string, now = new Date()): string {
  const done = new Date(completedAt)
  const days = daysBetween(now, done)
  const clock = time.format(done)
  if (days === 0) return `hoy ${clock}`
  if (days === -1) return `ayer ${clock}`
  if (Math.abs(days) <= 7) return `${weekdayShort.format(done)} ${clock}`
  return `${dayMonth.format(done)} ${clock}`
}

/** Finished after its due date (a day-only date counts until 23:59 of that day). */
export function finishedLate(task: { due_at: string | null; completed_at: string | null }): boolean {
  return !!task.due_at && !!task.completed_at && new Date(task.completed_at).getTime() > new Date(task.due_at).getTime()
}

/** Value for <input type="date"> (local day) from an API date. */
export function toDateInput(dueAt: string | null): string {
  if (!dueAt) return ''
  const d = new Date(dueAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Value for <input type="time">, empty for day-only dates. */
export function toTimeInput(dueAt: string | null): string {
  if (!dueAt) return ''
  const d = new Date(dueAt)
  if (isAllDay(d)) return ''
  return time.format(d)
}

/** Builds the ISO string to send to the API from local date/time inputs. */
export function fromInputs(date: string, clock = ''): string | null {
  if (!date) return null
  const [h, m] = clock ? clock.split(':').map(Number) : [DAY_END_HOURS, DAY_END_MINUTES]
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(y, mo - 1, d, h, m).toISOString()
}

/** Shortcuts for the quick-add menu. */
export function shortcutDate(kind: 'today' | 'tomorrow' | 'nextWeek', now = new Date()): string {
  const d = new Date(now)
  if (kind === 'tomorrow') d.setDate(d.getDate() + 1)
  if (kind === 'nextWeek') d.setDate(d.getDate() + 7)
  d.setHours(DAY_END_HOURS, DAY_END_MINUTES, 0, 0)
  return d.toISOString()
}

/* ---------- Calendar / timeline helpers (all in local time) ---------- */

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "2026-11-04" for a local day. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export { startOfDay, daysBetween }

/** Monday of the week (weeks start on Monday). */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  return addDays(d, -((d.getDay() + 6) % 7))
}

/** The 6 weeks (42 days) shown in a month view, starting on a Monday. */
export function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** End of a local day (23:59:59.999), for inclusive API ranges. */
export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Same time of day as `iso`, on another local day. */
export function moveToDay(iso: string, day: Date): string {
  const src = new Date(iso)
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), src.getHours(), src.getMinutes())
  return d.toISOString()
}

/** Shifts a date by whole days, keeping its time of day. */
export function shiftDays(iso: string, days: number): string {
  return moveToDay(iso, addDays(new Date(iso), days))
}

/** Start dates are day-only: stored as 00:00 local time. */
export function startFromInput(date: string): string | null {
  return date ? parseDayKey(date).toISOString() : null
}

/** A day-only due date (23:59 local) for that day. */
export function dueAtEndOf(day: Date): string {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), DAY_END_HOURS, DAY_END_MINUTES).toISOString()
}

export function formatTime(iso: string): string | null {
  const d = new Date(iso)
  return isAllDay(d) ? null : time.format(d)
}

/** Calendar day a task sits on: its due day, or its start day if it has no due date. */
export function taskDayKey(task: { due_at: string | null; start_at: string | null }): string | null {
  const iso = task.due_at ?? task.start_at
  return iso ? dayKey(new Date(iso)) : null
}

/** Inside a day: open before done, then by time, then by priority. */
export function sortDayTasks(
  a: { completed: boolean; due_at: string | null; priority: number },
  b: { completed: boolean; due_at: string | null; priority: number },
) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1
  return (a.due_at ?? '').localeCompare(b.due_at ?? '') || a.priority - b.priority
}
