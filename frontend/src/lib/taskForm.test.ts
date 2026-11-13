import { describe, expect, it } from 'vitest'
import type { Task } from '../api/types'
import { emptyTaskValues, startAfterDue, toTaskInput, valuesFromTask } from './taskForm'

const TASK = { title: 'x', description: null, priority: 2, status_id: 1, project_id: null, due_at: null, assignees: [] } as unknown as Task

describe('toTaskInput', () => {
  it('trims text, converts ids and leaves the status to the server when not chosen', () => {
    const input = toTaskInput(
      emptyTaskValues({ title: '  Revisar impresora  ', projectId: '7', assigneeIds: [1], dueDate: '2026-11-04' }),
    )

    expect(input.title).toBe('Revisar impresora')
    expect(input.project_id).toBe(7)
    expect(input.description).toBeNull()
    expect(input).not.toHaveProperty('status_id')
    expect(input.due_at).not.toBeNull()
    expect(input.assignee_ids).toEqual([1])
  })

  it('never sends the project for subtasks (they follow their parent)', () => {
    const input = toTaskInput(emptyTaskValues({ title: 'Paso', projectId: '7' }), false)

    expect(input).not.toHaveProperty('project_id')
  })

  it('sends null to clear the due date', () => {
    expect(toTaskInput(emptyTaskValues({ title: 'x' })).due_at).toBeNull()
  })
})

describe('start date', () => {
  it('sends the start as the beginning of that local day', () => {
    const input = toTaskInput(emptyTaskValues({ title: 'x', startDate: '2026-11-02', dueDate: '2026-11-06' }))
    const start = new Date(input.start_at!)
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([2, 0, 0])
  })

  it('flags a start after the due date', () => {
    expect(startAfterDue(emptyTaskValues({ startDate: '2026-11-07', dueDate: '2026-11-06' }))).toBe(true)
    expect(startAfterDue(emptyTaskValues({ startDate: '2026-11-06', dueDate: '2026-11-06' }))).toBe(false)
    expect(startAfterDue(emptyTaskValues({ startDate: '2026-11-07' }))).toBe(false)
  })

  it('sends and reads back the start time', () => {
    const input = toTaskInput(emptyTaskValues({ title: 'x', startDate: '2026-11-12', startTime: '09:30' }))
    const start = new Date(input.start_at!)
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([12, 9, 30])
    const values = valuesFromTask({ ...TASK, start_at: input.start_at ?? null })
    expect([values.startDate, values.startTime]).toEqual(['2026-11-12', '09:30'])
    expect(valuesFromTask({ ...TASK, start_at: new Date(2026, 10, 12).toISOString() }).startTime).toBe('')
  })

  it('compares times on the same day', () => {
    const base = { startDate: '2026-11-12', dueDate: '2026-11-12' }
    expect(startAfterDue(emptyTaskValues({ ...base, startTime: '15:00', dueTime: '10:00' }))).toBe(true)
    expect(startAfterDue(emptyTaskValues({ ...base, startTime: '09:00', dueTime: '10:00' }))).toBe(false)
    // A day-only due date lasts until the end of the day.
    expect(startAfterDue(emptyTaskValues({ ...base, startTime: '22:00' }))).toBe(false)
  })
})
