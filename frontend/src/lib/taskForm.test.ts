import { describe, expect, it } from 'vitest'
import { emptyTaskValues, startAfterDue, toTaskInput } from './taskForm'

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
})
