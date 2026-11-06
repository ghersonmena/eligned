import { describe, expect, it } from 'vitest'
import type { Task } from '../../api/types'
import { answerQuery } from './answer'

const NOW = new Date(2026, 10, 6, 10, 30)
const task = (id: number, title: string, due: Date | null) => ({ id, title, due_at: due?.toISOString() ?? null }) as Task

const open = [
  task(1, 'RESPALDO DEL NAS', new Date(2026, 10, 6, 12, 0)),
  task(2, 'IR A LA CITA CON MI ESPOSA', new Date(2026, 10, 6, 17, 0)),
  task(3, 'INVENTARIO', new Date(2026, 10, 7, 23, 59)),
  task(4, 'CAMBIAR UPS', new Date(2026, 10, 4, 23, 59)),
  task(5, 'SIN FECHA', null),
]

describe('answerQuery', () => {
  it('reads today, with the late ones', () => {
    const a = answerQuery('today', open, NOW)
    expect(a.tasks.map((t) => t.id)).toEqual([1, 2])
    expect(a.spoken).toBe(
      'Hoy tienes 2 tareas: respaldo del nas a las 12 del día y ir a la cita con mi esposa a las 5 de la tarde. Además tienes 1 tarea atrasada.',
    )
  })

  it('reads tomorrow without a time for all-day tasks', () => {
    expect(answerQuery('tomorrow', open, NOW).spoken).toBe('Mañana tienes 1 tarea: inventario.')
  })

  it('covers the week and the overdue', () => {
    expect(answerQuery('week', open, NOW).tasks.map((t) => t.id)).toEqual([1, 2, 3])
    expect(answerQuery('overdue', open, NOW).text).toBe('Tienes 1 tarea atrasada.')
  })

  it('says when there is nothing', () => {
    expect(answerQuery('tomorrow', [], NOW).spoken).toBe('No tienes tareas para mañana.')
  })
})
