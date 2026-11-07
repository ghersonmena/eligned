import type { Activity } from '../api/types'
import { PRIORITIES } from './colors'
import { isAllDay } from './dates'
import { dateFormat, relativeFormat, t } from './i18n'

const day = { format: (d: Date) => dateFormat({ day: 'numeric', month: 'short', year: 'numeric' }).format(d) }
const dayTime = { format: (d: Date) => dateFormat({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d) }

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

/** Short form for tight spots (inside a ring): "45m", "1h 45m". */
export function formatMinutesShort(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
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
      return [t('creó la tarea')]
    case 'deleted':
      return [t('eliminó la tarea')]
    case 'commented':
      return [t('comentó: "{text}"', { text: String(c.excerpt ?? '') })]
    case 'subtask_added':
      return [t('agregó la subtarea "{title}"', { title: String(c.subtask ?? '') })]
    case 'time_logged':
      return [t('registró {time} de trabajo', { time: formatMinutes(Number(c.minutes ?? 0)) })]
    case 'assigned': {
      const added = (c.added as string[] | undefined) ?? []
      const removed = (c.removed as string[] | undefined) ?? []
      return [
        ...(added.length ? [t('asignó a {names}', { names: added.join(', ') })] : []),
        ...(removed.length ? [t('quitó a {names}', { names: removed.join(', ') })] : []),
      ]
    }
  }

  const bySubtasks = c.reason === 'subtasks'
  const lines: string[] = []
  const pair = (field: string) => c[field] as Pair | undefined

  const done = pair('completed_at')
  if (done) {
    if (!done[0] && done[1]) lines.push(bySubtasks ? t('se completó al cerrar todas sus subtareas') : t('completó la tarea'))
    else if (done[0] && !done[1]) lines.push(bySubtasks ? t('se reabrió porque una subtarea quedó abierta') : t('reabrió la tarea'))
  }
  const status = pair('status_id')
  if (status && !done) lines.push(t('la movió de {from} a {to}', { from: String(status[0] ?? '—'), to: String(status[1] ?? '—') }))
  const title = pair('title')
  if (title) lines.push(t('cambió el título a "{title}"', { title: String(title[1]) }))
  if ('description' in c) lines.push(t('editó la descripción'))
  const priority = pair('priority')
  if (priority) lines.push(t('cambió la prioridad a {level}', { level: PRIORITIES.find((p) => p.value === priority[1])?.label.toLowerCase() ?? String(priority[1]) }))
  const project = pair('project_id')
  if (project) lines.push(project[1] ? t('la pasó al proyecto {name}', { name: String(project[1]) }) : t('le quitó el proyecto'))

  const start = pair('start_at')
  const due = pair('due_at')
  if (bySubtasks && (start || due)) {
    lines.push(t('sus fechas se ajustaron a sus subtareas'))
  } else {
    if (due) lines.push(due[1] ? t('cambió la fecha límite a {date}', { date: formatDate(due[1]) }) : t('quitó la fecha límite'))
    if (start) lines.push(start[1] ? t('cambió el inicio a {date}', { date: formatDate(start[1]) }) : t('quitó la fecha de inicio'))
  }
  return lines
}

/** True for entries the system did on its own (no person behind them). */
export function isAutomatic(a: Activity): boolean {
  return a.changes?.reason === 'subtasks' || !a.user
}


/** "hace 5 minutos", "ayer"… */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000)
  if (Math.abs(minutes) < 1) return t('ahora')
  const rtf = relativeFormat()
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

