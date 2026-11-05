import { api } from './client'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface Preferences {
  theme: ThemePreference
  confetti: boolean
  /** IANA zone of the user's device (kept in sync by the app). */
  timezone: string
  /** "Vence pronto" for tasks with a time: minutes before, or null (off). */
  due_notice_minutes: number | null
  /** All-day tasks: heads-up that morning at all_day_notice_time (HH:MM). */
  all_day_notice: boolean
  all_day_notice_time: string
  /** Live popups inside the app. */
  popups: boolean
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
  email_verified: boolean
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

export interface RegisterResult {
  message: string
  email: string
}

export const authApi = {
  me: () => api<Wrapped<User>>('GET', '/me').then((r) => r.data),
  login: (input: LoginInput) => api<Wrapped<User>>('POST', '/auth/login', input).then((r) => r.data),
  register: (input: RegisterInput) => api<RegisterResult>('POST', '/auth/register', input),
  logout: () => api<void>('POST', '/auth/logout'),
  resendVerification: (email: string) => api<void>('POST', '/email/verification-notification', { email }),
  updatePreferences: (prefs: Partial<Preferences>) =>
    api<Wrapped<User>>('PATCH', '/me/preferences', prefs).then((r) => r.data),
}
