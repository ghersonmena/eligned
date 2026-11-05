import type { Workspace } from './auth'
import { api } from './client'
import type { Invitation, InvitationInfo, Member, Role, Workload } from './types'

interface Wrapped<T> {
  data: T
}
const unwrap = <T>(r: Wrapped<T>) => r.data

export const teamApi = {
  rename: (ws: number, name: string) => api<Wrapped<Workspace>>('PATCH', `/workspaces/${ws}`, { name }).then(unwrap),
  setRole: (ws: number, userId: number, role: Exclude<Role, 'owner'>) =>
    api<Wrapped<Member>>('PATCH', `/workspaces/${ws}/members/${userId}`, { role }).then(unwrap),
  removeMember: (ws: number, userId: number) => api<void>('DELETE', `/workspaces/${ws}/members/${userId}`),

  invitations: (ws: number) => api<Wrapped<Invitation[]>>('GET', `/workspaces/${ws}/invitations`).then(unwrap),
  invite: (ws: number, input: { email: string; role: Exclude<Role, 'owner'>; send_email: boolean }) =>
    api<Wrapped<Invitation>>('POST', `/workspaces/${ws}/invitations`, input).then(unwrap),
  renew: (id: number, sendEmail: boolean) =>
    api<Wrapped<Invitation>>('POST', `/invitations/${id}/renew`, { send_email: sendEmail }).then(unwrap),
  revoke: (id: number) => api<void>('DELETE', `/invitations/${id}`),

  workload: (ws: number, since: string) =>
    api<{ data: Workload[]; unassigned: number }>('GET', `/workspaces/${ws}/workload?since=${encodeURIComponent(since)}`),

  invitationInfo: (token: string) => api<Wrapped<InvitationInfo>>('GET', `/invitations/${token}`).then(unwrap),
  accept: (token: string) => api<Wrapped<{ workspace_id: number }>>('POST', `/invitations/${token}/accept`).then(unwrap),
}
