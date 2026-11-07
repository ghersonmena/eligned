import { describe, expect, it } from 'vitest'
import type { Activity } from '../api/types'
import { describeActivity, formatMinutes, formatMinutesShort } from './activity'

const entry = (event: Activity['event'], changes: Activity['changes'] = null): Activity => ({
  id: 1, event, task_id: 1, subject: 'x', changes, user: { id: 1, name: 'Ana' }, created_at: '',
})

describe('describeActivity', () => {
  it('describes completing and reopening, by hand or by the subtasks', () => {
    expect(describeActivity(entry('updated', { completed_at: [null, '2026-11-04T10:00:00Z'], status_id: ['Por hacer', 'Hecho'] }))).toEqual([
      'completó la tarea',
    ])
    expect(describeActivity(entry('updated', { completed_at: ['2026-11-04T10:00:00Z', null], reason: 'subtasks' }))).toEqual([
      'se reabrió porque una subtarea quedó abierta',
    ])
  })

  it('lists every field that changed', () => {
    const lines = describeActivity(entry('updated', { title: ['a', 'b'], status_id: ['Por hacer', 'En progreso'], priority: [2, 1], due_at: ['x', null] }))
    expect(lines).toEqual(['la movió de Por hacer a En progreso', 'cambió el título a "b"', 'cambió la prioridad a alta', 'quitó la fecha límite'])
  })

  it('describes the other events', () => {
    expect(describeActivity(entry('assigned', { added: ['Ana'], removed: ['Luis'] }))).toEqual(['asignó a Ana', 'quitó a Luis'])
    expect(describeActivity(entry('time_logged', { minutes: 95 }))).toEqual(['registró 1 h 35 min de trabajo'])
  })
})

describe('formatMinutes', () => {
  it('reads naturally', () => {
    expect([formatMinutes(5), formatMinutes(60), formatMinutes(125)]).toEqual(['5 min', '1 h', '2 h 5 min'])
  })

  it('has a short form for rings', () => {
    expect([formatMinutesShort(45), formatMinutesShort(60), formatMinutesShort(105)]).toEqual(['45m', '1h', '1h 45m'])
  })
})
