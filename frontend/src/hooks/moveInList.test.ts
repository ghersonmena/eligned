import { describe, expect, it, vi } from 'vitest'
import type { Task, TaskStatus } from '../api/types'

vi.mock('./useAuth', () => ({ useMe: () => ({ data: undefined }) }))
const { moveInList } = await import('./useWorkspaceData')

const status = (id: number, is_done = false): TaskStatus => ({ id, name: `s${id}`, color: 'slate', position: id, is_done })
const t = (id: number, status_id: number): Task => ({
  id, title: `t${id}`, description: null, priority: 2, status_id, project_id: null, parent_id: null,
  start_at: null, due_at: null, completed: false, completed_at: null, position: 0, created_at: '',
})

describe('moveInList', () => {
  const list = [t(1, 1), t(2, 1), t(3, 2), t(4, 2)]
  const column = (tasks: Task[], s: number) => tasks.filter((x) => x.status_id === s).map((x) => x.id)

  it('moves a card into another column at an index', () => {
    const out = moveInList(list, 1, status(2), 1)
    expect(column(out, 2)).toEqual([3, 1, 4])
    expect(column(out, 1)).toEqual([2])
  })

  it('reorders inside a column', () => {
    expect(column(moveInList(list, 4, status(2), 0), 2)).toEqual([4, 3])
  })

  it('marks cards dropped in a done column as completed', () => {
    const moved = moveInList(list, 2, status(3, true), 0).find((x) => x.id === 2)!
    expect(moved.completed).toBe(true)
    expect(moved.completed_at).not.toBeNull()
  })
})
