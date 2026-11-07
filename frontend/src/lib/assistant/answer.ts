import type { Task } from '../../api/types'
import { dueGroup, isAllDay } from '../dates'
import { sayDay, sayTime } from './describe'
import type { QueryRange } from './parse'

export interface QueryAnswer {
  /** What the panel shows. */
  text: string
  /** What is said out loud (titles in lower case, so they aren't spelled out). */
  spoken: string
  tasks: Task[]
}

const SAY_AT_MOST = 5

const LABEL: Record<QueryRange, string> = {
  today: 'hoy',
  tomorrow: 'mañana',
  week: 'en los próximos 7 días',
  overdue: 'atrasadas',
}

const plural = (n: number) => (n === 1 ? '1 tarea' : `${n} tareas`)

function sayTask(t: Task, range: QueryRange, now: Date): string {
  const title = t.title.toLocaleLowerCase('es')
  if (!t.due_at) return title
  const due = new Date(t.due_at)
  const time = isAllDay(due) ? '' : ` ${sayTime(due.getHours(), due.getMinutes())}`
  if (range === 'today' || range === 'tomorrow') return title + time
  return `${title}, ${sayDay(due, now)}${time}`
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join('; ')} y ${items[items.length - 1]}`
}

/** "¿Qué tengo hoy?": the open tasks for that range, soonest first. */
export function answerQuery(range: QueryRange, open: Task[], now = new Date()): QueryAnswer {
  const groups: Record<QueryRange, string[]> = {
    today: ['today'],
    tomorrow: ['tomorrow'],
    week: ['today', 'tomorrow', 'week'],
    overdue: ['overdue'],
  }
  const tasks = open
    .filter((t) => groups[range].includes(dueGroup(t.due_at, now)))
    .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))
  const overdue = range === 'today' ? open.filter((t) => dueGroup(t.due_at, now) === 'overdue').length : 0
  const late = overdue ? ` Además tienes ${plural(overdue)} ${overdue === 1 ? 'atrasada' : 'atrasadas'}.` : ''

  if (tasks.length === 0) {
    const none = range === 'overdue' ? 'No tienes tareas atrasadas. ¡Bien!' : `No tienes tareas para ${LABEL[range]}.`
    return { text: none + late, spoken: none + late, tasks }
  }
  const head = range === 'overdue' ? `Tienes ${plural(tasks.length)} ${tasks.length === 1 ? 'atrasada' : 'atrasadas'}` : `${LABEL[range][0].toUpperCase()}${LABEL[range].slice(1)} tienes ${plural(tasks.length)}`
  const said = tasks.slice(0, SAY_AT_MOST).map((t) => sayTask(t, range, now))
  const more = tasks.length > SAY_AT_MOST ? `, y ${tasks.length - SAY_AT_MOST} más` : ''
  return {
    text: `${head}.${late}`,
    spoken: `${head}: ${list(said)}${more}.${late}`,
    tasks,
  }
}
