import type { User, Workspace } from '../api/auth'
import type { Role } from '../api/types'

/** The workspace the app is showing: the one chosen in preferences, or the first. */
export function currentWorkspace(user: User): Workspace | undefined {
  const chosen = user.preferences.current_workspace_id
  return user.workspaces.find((w) => w.id === chosen) ?? user.workspaces[0]
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  member: 'Miembro',
  guest: 'Invitado',
}

export const ROLE_HINTS: Record<Role, string> = {
  owner: 'Creó el espacio. Puede todo.',
  admin: 'Invita y administra a las personas, y edita todo.',
  member: 'Crea y edita tareas, comenta y registra tiempo.',
  guest: 'Solo puede ver.',
}

export function canManage(role: Role | undefined): boolean {
  return role === 'owner' || role === 'admin'
}
