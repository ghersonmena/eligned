import { describe, expect, it } from 'vitest'
import { emptyTaskValues, toTaskInput } from './taskForm'

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
