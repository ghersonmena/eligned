import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { goalsApi } from '../api/goals'
import type { GoalInput, KeyResultInput } from '../api/types'
import { useWorkspaceId } from './useWorkspaceData'

// Under ['ws', id] so task changes (which move "tasks" key results) refresh them too.
const goalsKey = (ws: number) => ['ws', ws, 'goals'] as const

export function useGoals(closed = false) {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: [...goalsKey(ws), { closed }], queryFn: () => goalsApi.list(ws, closed) })
}

export function useGoal(id: number) {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: [...goalsKey(ws), 'one', id], queryFn: () => goalsApi.get(id) })
}

function useGoalMutation<V, R>(fn: (ws: number, vars: V) => Promise<R>) {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (vars: V) => fn(ws, vars),
    onSuccess: () => void client.invalidateQueries({ queryKey: goalsKey(ws) }),
  })
}

export const useCreateGoal = () => useGoalMutation((ws, input: GoalInput) => goalsApi.create(ws, input))
export const useUpdateGoal = () => useGoalMutation((_ws, v: { id: number; input: GoalInput }) => goalsApi.update(v.id, v.input))
export const useDeleteGoal = () => useGoalMutation((_ws, id: number) => goalsApi.remove(id))
export const useAddKeyResult = () =>
  useGoalMutation((_ws, v: { goalId: number; input: KeyResultInput }) => goalsApi.addKeyResult(v.goalId, v.input))
export const useUpdateKeyResult = () =>
  useGoalMutation((_ws, v: { id: number; input: KeyResultInput }) => goalsApi.updateKeyResult(v.id, v.input))
export const useDeleteKeyResult = () => useGoalMutation((_ws, id: number) => goalsApi.removeKeyResult(id))
