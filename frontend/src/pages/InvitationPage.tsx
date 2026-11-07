import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { teamApi } from '../api/team'
import { Logo } from '../components/Logo'
import { APP_NAME } from '../lib/brand'
import { useLogout, useMe } from '../hooks/useAuth'
import { celebrate } from '../lib/celebrate'
import { rememberInvitation } from '../lib/pendingInvitation'
import { roleHint, roleLabel } from '../lib/workspace'
import styles from './pages.module.css'
import { t, tx } from '../lib/i18n'

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
      setError(e instanceof ApiError ? e.message : t('No se pudo aceptar la invitación.'))
      setAccepting(false)
    }
  }

  const data = info.data
  const sameEmail = user && data && user.email.toLowerCase() === data.email

  let body
  if (info.isPending || loadingUser) {
    body = <p className={styles.lead}>{t('Cargando invitación…')}</p>
  } else if (info.isError || !data) {
    body = (
      <>
        <p className={styles.lead}>{t('Esta invitación no existe o fue cancelada.')}</p>
        <Link to="/">{t('Ir al inicio')}</Link>
      </>
    )
  } else if (data.accepted || data.expired) {
    body = (
      <>
        <p className={styles.lead}>
          {data.accepted ? t('Esta invitación ya se usó.') : t('Esta invitación venció.')}{' '}
          {data.inviter ? t('Pide a {name} que te envíe una nueva.', { name: data.inviter }) : t('Pide a quien te invitó que te envíe una nueva.')}
        </p>
        <Link to="/">{t('Ir al inicio')}</Link>
      </>
    )
  } else {
    body = (
      <>
        <p className={styles.lead}>
          {tx('{who} te invitó a {space} como {role}: {hint}', {
            who: <strong>{data.inviter ?? t('Alguien')}</strong>,
            space: <strong>{data.workspace}</strong>,
            role: <strong>{roleLabel(data.role).toLowerCase()}</strong>,
            hint: roleHint(data.role).toLowerCase(),
          })}
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {user && sameEmail && (
          <button type="button" className={styles.primary} disabled={accepting} onClick={() => void accept()}>
            {accepting ? t('Uniéndote…') : t('Unirme a {space}', { space: data.workspace })}
          </button>
        )}
        {user && !sameEmail && (
          <>
            <p className={styles.notice}>
              {tx('La invitación es para {invited}, pero entraste como {current}.', {
                invited: <strong>{data.email}</strong>,
                current: <strong>{user.email}</strong>,
              })}
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
              {t('Entrar con {email}', { email: data.email })}
            </button>
          </>
        )}
        {!user && (
          <>
            <p>
              {tx('Para unirte necesitas una cuenta con {email}.', { email: <strong>{data.email}</strong> })}
            </p>
            <Link
              className={`${styles.primary} ${styles.buttonLink}`}
              to={`/registro?email=${encodeURIComponent(data.email)}`}
              onClick={() => rememberInvitation(token)}
            >
              {t('Crear mi cuenta')}
            </Link>
            <Link
              className={`${styles.secondary} ${styles.buttonLink}`}
              to={`/login?email=${encodeURIComponent(data.email)}`}
              onClick={() => rememberInvitation(token)}
            >
              {t('Ya tengo cuenta')}
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
          <Logo /> {APP_NAME}
        </div>
        <h1 className={styles.authTitle}>
          <span>{t('Te invitaron')}</span> {t('a colaborar')}
        </h1>
        <div className={styles.form}>{body}</div>
      </div>
    </main>
  )
}
