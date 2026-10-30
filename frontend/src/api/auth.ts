import { api } from './client'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface Preferences {
  theme: ThemePreference
  confetti: boolean
}

export interface Workspace {
  id: number
  name: string
  personal: boolean
  role?: 'owner' | 'admin' | 'member' | 'guest'
}

export interface User {
  id: number
  name: string
  email: string
  preferences: Preferences
  workspaces: Workspace[]
}

interface Wrapped<T> {
  data: T
}

export interface LoginInput {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export const authApi = {
  me: () => api<Wrapped<User>>('GET', '/me').then((r) => r.data),
  login: (input: LoginInput) => api<Wrapped<User>>('POST', '/auth/login', input).then((r) => r.data),
  register: (input: RegisterInput) =>
    api<Wrapped<User>>('POST', '/auth/register', input).then((r) => r.data),
  logout: () => api<void>('POST', '/auth/logout'),
  updatePreferences: (prefs: Partial<Preferences>) =>
    api<Wrapped<User>>('PATCH', '/me/preferences', prefs).then((r) => r.data),
}
