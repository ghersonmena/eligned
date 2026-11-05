import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teamApi } from '../api/team'
import type { Role } from '../api/types'
import { startOfWeek } from '../lib/dates'
import { keys, useWorkspaceId } from './useWorkspaceData'

const invitationsKey = (ws: number) => ['ws', ws, 'invitations'] as const

export function useInvitations(enabled: boolean) {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: invitationsKey(ws), queryFn: () => teamApi.invitations(ws), enabled })
}

/** Open / overdue / this week per person, plus what they finished and logged since Monday. */
export function useWorkload() {
  const ws = useWorkspaceId()
  return useQuery({
    queryKey: ['ws', ws, 'workload'],
    queryFn: () => teamApi.workload(ws, startOfWeek(new Date()).toISOString()),
  })
}

function useTeamMutation<V, R>(fn: (ws: number, vars: V) => Promise<R>, refreshMe = false) {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (vars: V) => fn(ws, vars),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.members(ws) })
      void client.invalidateQueries({ queryKey: invitationsKey(ws) })
      if (refreshMe) void client.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export const useRenameWorkspace = () => useTeamMutation((ws, name: string) => teamApi.rename(ws, name), true)
export const useSetRole = () =>
  useTeamMutation((ws, v: { userId: number; role: Exclude<Role, 'owner'> }) => teamApi.setRole(ws, v.userId, v.role))
export const useRemoveMember = () => useTeamMutation((ws, userId: number) => teamApi.removeMember(ws, userId), true)
export const useInvite = () =>
  useTeamMutation((ws, input: { email: string; role: Exclude<Role, 'owner'>; send_email: boolean }) => teamApi.invite(ws, input))
export const useRenewInvitation = () => useTeamMutation((_ws, v: { id: number; sendEmail: boolean }) => teamApi.renew(v.id, v.sendEmail))
export const useRevokeInvitation = () => useTeamMutation((_ws, id: number) => teamApi.revoke(id))
