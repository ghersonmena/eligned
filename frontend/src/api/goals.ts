import { upperFields } from '../lib/text'
import { api } from './client'
import type { Goal, GoalInput, KeyResult, KeyResultInput } from './types'

interface Wrapped<T> {
  data: T
}
const unwrap = <T>(r: Wrapped<T>) => r.data
const upperGoal = (input: GoalInput) => upperFields(input, ['title', 'description'])
const upperKr = (input: KeyResultInput) => upperFields(input, ['title', 'unit'])

export const goalsApi = {
  list: (ws: number, closed = false) => api<Wrapped<Goal[]>>('GET', `/workspaces/${ws}/goals${closed ? '?closed=1' : ''}`).then(unwrap),
  get: (id: number) => api<Wrapped<Goal>>('GET', `/goals/${id}`).then(unwrap),
  create: (ws: number, input: GoalInput) => api<Wrapped<Goal>>('POST', `/workspaces/${ws}/goals`, upperGoal(input)).then(unwrap),
  update: (id: number, input: GoalInput) => api<Wrapped<Goal>>('PATCH', `/goals/${id}`, upperGoal(input)).then(unwrap),
  remove: (id: number) => api<void>('DELETE', `/goals/${id}`),
  addKeyResult: (goalId: number, input: KeyResultInput) =>
    api<Wrapped<KeyResult>>('POST', `/goals/${goalId}/key-results`, upperKr(input)).then(unwrap),
  updateKeyResult: (id: number, input: KeyResultInput) =>
    api<Wrapped<KeyResult>>('PATCH', `/key-results/${id}`, upperKr(input)).then(unwrap),
  removeKeyResult: (id: number) => api<void>('DELETE', `/key-results/${id}`),
}
