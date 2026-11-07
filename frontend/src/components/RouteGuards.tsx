import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { User } from '../api/auth'
import { useMe } from '../hooks/useAuth'
import { t } from '../lib/i18n'

function Splash() {
  return <div role="status" aria-label={t('Cargando')} style={{ minHeight: '100dvh' }} />
}

/** Renders the app only for a signed-in user. */
export function RequireUser({ children }: { children: (user: User) => ReactNode }) {
  const { data: user, isPending } = useMe()
  if (isPending) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return children(user)
}

/** Login and register are only for visitors without a session. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useMe()
  if (isPending) return <Splash />
  if (user) return <Navigate to="/" replace />
  return children
}
