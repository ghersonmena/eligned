import { useNavigate, useSearchParams } from 'react-router'
import type { User } from '../api/auth'
import { ApiError } from '../api/client'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useLogout, useMe, useResendVerification } from '../hooks/useAuth'
import styles from './pages.module.css'

/** Shown instead of the app until the account's email is confirmed. */
export function VerifyEmailPage({ user }: { user: User }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const resend = useResendVerification()
  const me = useMe()
  const logout = useLogout()

  const invalidLink = params.get('correo') === 'enlace-invalido'
  const tooMany = resend.error instanceof ApiError && resend.error.status === 429

  return (
    <main className={styles.authShell}>
      <div className={styles.authCard}>
        <div className={styles.authBrand}>
          <Logo /> [nombre]
        </div>
        <span className={styles.bigIcon} aria-hidden="true">
          <Icon name="mail" size={28} />
        </span>
        <h1 className={styles.authTitle}>
          <span>Un paso más,</span> confirma tu correo
        </h1>
        <p className={styles.lead}>
          Te enviamos un enlace a <strong>{user.email}</strong>. Ábrelo para activar tu cuenta. Si no lo ves, revisa la
          carpeta de spam.
        </p>
        {invalidLink && (
          <p className={styles.error} role="alert">
            Ese enlace no es válido o ya venció. Pide uno nuevo.
          </p>
        )}
        {resend.isSuccess && (
          <p className={styles.success} role="status">
            Listo, te enviamos un correo nuevo.
          </p>
        )}
        {tooMany && (
          <p className={styles.error} role="alert">
            Ya pediste varios correos. Espera un minuto antes de intentarlo otra vez.
          </p>
        )}
        <button
          type="button"
          className={styles.primary}
          disabled={me.isFetching}
          onClick={() => void me.refetch()}
        >
          {me.isFetching ? 'Revisando…' : 'Ya lo confirmé'}
        </button>
        <button type="button" className={styles.secondary} disabled={resend.isPending} onClick={() => resend.mutate()}>
          {resend.isPending ? 'Enviando…' : 'Reenviar correo'}
        </button>
        <p className={styles.switchLink}>
          ¿Correo equivocado?{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/registro', { replace: true }) })}
          >
            Registrarme con otro correo
          </button>
        </p>
      </div>
    </main>
  )
}
