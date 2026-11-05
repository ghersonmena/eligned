import type { Activity } from '../api/types'
import { PRIORITIES } from './colors'
import { isAllDay } from './dates'

const day = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
const dayTime = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function formatDate(iso: unknown): string {
  if (typeof iso !== 'string') return ''
  const d = new Date(iso)
  return isAllDay(d) || (d.getHours() === 0 && d.getMinutes() === 0) ? day.format(d) : dayTime.format(d)
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

type Pair = [unknown, unknown]

/**
 * Sentences for one history entry, without the actor ("completó la tarea").
 * An entry may produce several (one per field that changed).
 */
export function describeActivity(a: Activity): string[] {
  const c = (a.changes ?? {}) as Record<string, unknown>
  switch (a.event) {
    case 'created':
      return ['creó la tarea']
    case 'deleted':
      return ['eliminó la tarea']
    case 'commented':
      return [`comentó: "${String(c.excerpt ?? '')}"`]
    case 'subtask_added':
      return [`agregó la subtarea "${String(c.subtask ?? '')}"`]
    case 'time_logged':
      return [`registró ${formatMinutes(Number(c.minutes ?? 0))} de trabajo`]
    case 'assigned': {
      const added = (c.added as string[] | undefined) ?? []
      const removed = (c.removed as string[] | undefined) ?? []
      return [
        ...(added.length ? [`asignó a ${added.join(', ')}`] : []),
        ...(removed.length ? [`quitó a ${removed.join(', ')}`] : []),
      ]
    }
  }

  const bySubtasks = c.reason === 'subtasks'
  const lines: string[] = []
  const pair = (field: string) => c[field] as Pair | undefined

  const done = pair('completed_at')
  if (done) {
    if (!done[0] && done[1]) lines.push(bySubtasks ? 'se completó al cerrar todas sus subtareas' : 'completó la tarea')
    else if (done[0] && !done[1]) lines.push(bySubtasks ? 'se reabrió porque una subtarea quedó abierta' : 'reabrió la tarea')
  }
  const status = pair('status_id')
  if (status && !done) lines.push(`la movió de ${status[0] ?? '—'} a ${status[1] ?? '—'}`)
  const title = pair('title')
  if (title) lines.push(`cambió el título a "${String(title[1])}"`)
  if ('description' in c) lines.push('editó la descripción')
  const priority = pair('priority')
  if (priority) lines.push(`cambió la prioridad a ${PRIORITIES.find((p) => p.value === priority[1])?.label.toLowerCase() ?? priority[1]}`)
  const project = pair('project_id')
  if (project) lines.push(project[1] ? `la pasó al proyecto ${String(project[1])}` : 'le quitó el proyecto')

  const start = pair('start_at')
  const due = pair('due_at')
  if (bySubtasks && (start || due)) {
    lines.push('sus fechas se ajustaron a sus subtareas')
  } else {
    if (due) lines.push(due[1] ? `cambió la fecha límite a ${formatDate(due[1])}` : 'quitó la fecha límite')
    if (start) lines.push(start[1] ? `cambió el inicio a ${formatDate(start[1])}` : 'quitó la fecha de inicio')
  }
  return lines
}

/** True for entries the system did on its own (no person behind them). */
export function isAutomatic(a: Activity): boolean {
  return a.changes?.reason === 'subtasks' || !a.user
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 5 minutos", "ayer"… */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000)
  if (Math.abs(minutes) < 1) return 'ahora'
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

