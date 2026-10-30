import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { User } from '../api/auth'
import { useMe } from '../hooks/useAuth'
import { VerifyEmailPage } from '../pages/VerifyEmailPage'

function Splash() {
  return <div role="status" aria-label="Cargando" style={{ minHeight: '100dvh' }} />
}

/** Renders the app only for a signed-in user. */
export function RequireUser({ children }: { children: (user: User) => ReactNode }) {
  const { data: user, isPending } = useMe()
  if (isPending) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  if (!user.email_verified) return <VerifyEmailPage user={user} />
  return children(user)
}

/** Login and register are only for visitors without a session. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useMe()
  if (isPending) return <Splash />
  if (user) return <Navigate to="/" replace />
  return children
}
