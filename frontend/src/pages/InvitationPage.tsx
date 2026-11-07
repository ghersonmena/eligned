import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { teamApi } from '../api/team'
import { Logo } from '../components/Logo'
import { useLogout, useMe } from '../hooks/useAuth'
import { celebrate } from '../lib/celebrate'
import { rememberInvitation } from '../lib/pendingInvitation'
import { ROLE_HINTS, ROLE_LABELS } from '../lib/workspace'
import styles from './pages.module.css'

/** /invitacion/:token — works with or without a session. */
export function InvitationPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const { data: user, isPending: loadingUser } = useMe()
  const logout = useLogout()
  const info = useQuery({ queryKey: ['invitation', token], queryFn: () => teamApi.invitationInfo(token), retry: false })
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setAccepting(true)
    setError(null)
    try {
      await teamApi.accept(token)
      await client.invalidateQueries({ queryKey: ['me'] })
      celebrate(user?.preferences.confetti ?? true)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo aceptar la invitación.')
      setAccepting(false)
    }
  }

  const data = info.data
  const sameEmail = user && data && user.email.toLowerCase() === data.email

  let body
  if (info.isPending || loadingUser) {
    body = <p className={styles.lead}>Cargando invitación…</p>
  } else if (info.isError || !data) {
    body = (
      <>
        <p className={styles.lead}>Esta invitación no existe o fue cancelada.</p>
        <Link to="/">Ir al inicio</Link>
      </>
    )
  } else if (data.accepted || data.expired) {
    body = (
      <>
        <p className={styles.lead}>
          {data.accepted ? 'Esta invitación ya se usó.' : 'Esta invitación venció.'} Pide a {data.inviter ?? 'quien te invitó'} que te envíe una
          nueva.
        </p>
        <Link to="/">Ir al inicio</Link>
      </>
    )
  } else {
    body = (
      <>
        <p className={styles.lead}>
          <strong>{data.inviter ?? 'Alguien'}</strong> te invitó a <strong>{data.workspace}</strong> como{' '}
          <strong>{ROLE_LABELS[data.role].toLowerCase()}</strong>: {ROLE_HINTS[data.role].toLowerCase()}
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {user && sameEmail && (
          <button type="button" className={styles.primary} disabled={accepting} onClick={() => void accept()}>
            {accepting ? 'Uniéndote…' : `Unirme a ${data.workspace}`}
          </button>
        )}
        {user && !sameEmail && (
          <>
            <p className={styles.notice}>
              La invitación es para <strong>{data.email}</strong>, pero entraste como <strong>{user.email}</strong>.
            </p>
            <button
              type="button"
              className={styles.primary}
              disabled={logout.isPending}
              onClick={() => {
                rememberInvitation(token)
                logout.mutate(undefined, { onSuccess: () => navigate(`/login?email=${encodeURIComponent(data.email)}`) })
              }}
            >
              Entrar con {data.email}
            </button>
          </>
        )}
        {!user && (
          <>
            <p>
              Para unirte necesitas una cuenta con <strong>{data.email}</strong>.
            </p>
            <Link
              className={`${styles.primary} ${styles.buttonLink}`}
              to={`/registro?email=${encodeURIComponent(data.email)}`}
              onClick={() => rememberInvitation(token)}
            >
              Crear mi cuenta
            </Link>
            <Link
              className={`${styles.secondary} ${styles.buttonLink}`}
              to={`/login?email=${encodeURIComponent(data.email)}`}
              onClick={() => rememberInvitation(token)}
            >
              Ya tengo cuenta
            </Link>
          </>
        )}
      </>
    )
  }

  return (
    <main className={styles.authShell}>
      <div className={styles.authCard}>
        <div className={styles.authBrand}>
          <Logo /> [nombre]
        </div>
        <h1 className={styles.authTitle}>
          <span>Te invitaron</span> a colaborar
        </h1>
        <div className={styles.form}>{body}</div>
      </div>
    </main>
  )
}
