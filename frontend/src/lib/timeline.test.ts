import { describe, expect, it } from 'vitest'
import type { Task } from '../api/types'
import { dayKey } from './dates'
import { datesAfterDrag, projectSpans, spanFromSubtasks, taskProgress, taskSpan } from './timeline'

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString()

function task(overrides: Partial<Task>): Task {
  return {
    id: 1, title: 't', description: null, priority: 2, status_id: 1, project_id: null, parent_id: null,
    start_at: null, due_at: null, completed: false, completed_at: null, position: 0, created_at: '',
    ...overrides,
  }
}

const day = (iso: string | null | undefined) => (iso ? dayKey(new Date(iso)) : iso)

describe('taskSpan', () => {
  it('uses start and due, or a single day when only one exists', () => {
    const both = taskSpan(task({ start_at: local(2026, 11, 2), due_at: local(2026, 11, 6, 23, 59) }))!
    expect([dayKey(both.start), dayKey(both.end)]).toEqual(['2026-11-02', '2026-11-06'])
    const dueOnly = taskSpan(task({ due_at: local(2026, 11, 6, 10) }))!
    expect([dayKey(dueOnly.start), dayKey(dueOnly.end)]).toEqual(['2026-11-06', '2026-11-06'])
    expect(taskSpan(task({}))).toBeNull()
  })
})

describe('datesAfterDrag', () => {
  const t = task({ start_at: local(2026, 11, 2), due_at: local(2026, 11, 6, 15, 30) })

  it('moves both dates keeping the due time', () => {
    const input = datesAfterDrag(t, 'move', 3)!
    expect(day(input.start_at)).toBe('2026-11-05')
    expect(day(input.due_at)).toBe('2026-11-09')
    expect(new Date(input.due_at!).getHours()).toBe(15)
  })

  it('resizes one side but never past the other', () => {
    expect(day(datesAfterDrag(t, 'start', 2)!.start_at)).toBe('2026-11-04')
    expect(day(datesAfterDrag(t, 'start', 10)!.start_at)).toBe('2026-11-06')
    expect(day(datesAfterDrag(t, 'end', -10)!.due_at)).toBe('2026-11-02')
    expect(datesAfterDrag(t, 'end', -10)).not.toHaveProperty('start_at')
  })

  it('gives a due-only task a start date when its start is pulled left', () => {
    const input = datesAfterDrag(task({ due_at: local(2026, 11, 6, 23, 59) }), 'start', -2)!
    expect(day(input.start_at)).toBe('2026-11-04')
  })

  it('returns null when nothing changes', () => {
    expect(datesAfterDrag(t, 'move', 0)).toBeNull()
    expect(datesAfterDrag(task({ due_at: local(2026, 11, 6) }), 'start', 3)).toBeNull()
  })
})

describe('taskProgress', () => {
  it('is 100 when completed, else the share of finished subtasks', () => {
    expect(taskProgress(task({ completed: true }))).toBe(100)
    expect(taskProgress(task({ subtasks_count: 4, subtasks_done_count: 1 }))).toBe(25)
    expect(taskProgress(task({}))).toBe(0)
  })
})

describe('parent dates from subtasks', () => {
  it('goes from the earliest subtask date to the latest one', () => {
    expect(
      spanFromSubtasks([
        { start_at: '2026-11-10T06:00:00Z', due_at: '2026-11-12T05:59:00Z' },
        { start_at: null, due_at: '2026-11-20T05:59:00Z' },
        { start_at: '2026-11-08T06:00:00Z', due_at: null },
        { start_at: null, due_at: null },
      ]),
    ).toEqual({ start_at: '2026-11-08T06:00:00Z', due_at: '2026-11-20T05:59:00Z' })
  })

  it('is null when no subtask has dates', () => {
    expect(spanFromSubtasks([{ start_at: null, due_at: null }])).toBeNull()
    expect(spanFromSubtasks([])).toBeNull()
  })
})

describe('projectSpans', () => {
  const project = (id: number, name: string) => ({ id, name, color: 'blue' as const })

  it('joins every task of a project into one span, subtasks included', () => {
    const spans = projectSpans([
      task({ project: project(1, 'Casa'), start_at: local(2026, 11, 3), due_at: local(2026, 11, 5) }),
      task({ project: project(1, 'Casa'), parent_id: 9, due_at: local(2026, 11, 12) }),
      task({ project: project(2, 'Auto'), due_at: local(2026, 11, 1) }),
      task({ project: null, due_at: local(2026, 11, 1) }),
    ])
    expect(spans.map((s) => [s.name, s.start.getDate(), s.end.getDate()])).toEqual([
      ['Auto', 1, 1],
      ['Casa', 3, 12],
    ])
  })
})
