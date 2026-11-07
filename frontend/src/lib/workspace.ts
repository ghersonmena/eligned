import type { User, Workspace } from '../api/auth'
import type { Role } from '../api/types'
import { t, tk } from './i18n'

/** The workspace the app is showing: the one chosen in preferences, or the first. */
export function currentWorkspace(user: User): Workspace | undefined {
  const chosen = user.preferences.current_workspace_id
  return user.workspaces.find((w) => w.id === chosen) ?? user.workspaces[0]
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: tk('Dueño'),
  admin: tk('Administrador'),
  member: tk('Miembro'),
  guest: tk('Invitado'),
}

export const ROLE_HINTS: Record<Role, string> = {
  owner: tk('Creó el espacio. Puede todo.'),
  admin: tk('Invita y administra a las personas, y edita todo.'),
  member: tk('Crea y edita tareas, comenta y registra tiempo.'),
  guest: tk('Solo puede ver.'),
}

/** "Administrador" / "Administrator", in the current language. */
export const roleLabel = (role: Role) => t(ROLE_LABELS[role])
export const roleHint = (role: Role) => t(ROLE_HINTS[role])

export function canManage(role: Role | undefined): boolean {
  return role === 'owner' || role === 'admin'
}
