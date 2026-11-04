import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { Logo } from '../components/Logo'
import { PasswordInput } from '../components/PasswordInput'
import { ResendNotice } from '../components/ResendNotice'
import { useLogin } from '../hooks/useAuth'
import { useResendFeedback } from '../hooks/useResendFeedback'
import { celebrate } from '../lib/celebrate'
import styles from './pages.module.css'

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const login = useLogin()
  const { resend, feedback } = useResendFeedback()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const justVerified = params.get('correo') === 'verificado'
  const invalidLink = params.get('correo') === 'enlace-invalido'

  const error = login.error instanceof ApiError ? login.error : null
  const unverified = error?.code === 'email_unverified'
  const wrongCredentials = Boolean(error?.fieldError('email'))

  useEffect(() => {
    if (justVerified) celebrate()
  }, [justVerified])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate({ email, password, remember }, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <main className={styles.authShell}>
      <div className={styles.authCard}>
        <div className={styles.authBrand}>
          <Logo /> [nombre]
        </div>
        {justVerified && (
          <p className={styles.notice} role="status">
            ¡Correo confirmado! Ya puedes iniciar sesión.
          </p>
        )}
        {invalidLink && (
          <p className={styles.error} role="alert">
            Ese enlace no es válido o ya venció. <Link to="/revisa-tu-correo">Pide uno nuevo</Link>.
          </p>
        )}
        <h1 className={styles.authTitle}>
          <span>Hola de nuevo,</span> entra a tu espacio
        </h1>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.field}>
            Correo
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={wrongCredentials ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </label>
          <label className={styles.field}>
            Contraseña
            <PasswordInput
              className={styles.input}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {wrongCredentials && (
            <span id="login-error" className={styles.error} role="alert">
              El correo o la contraseña no son correctos.
            </span>
          )}
          {unverified && (
            <div id="login-error" className={styles.callout} role="alert">
              <span>Aún no confirmas tu correo. Abre el enlace que te enviamos para poder entrar.</span>
              <button
                type="button"
                className={styles.linkButton}
                disabled={resend.isPending}
                onClick={() => resend.mutate(email)}
              >
                {resend.isPending ? 'Enviando…' : 'Reenviar correo'}
              </button>
              <ResendNotice feedback={feedback} />
            </div>
          )}
          {error && !wrongCredentials && !unverified && (
            <span id="login-error" className={styles.error} role="alert">
              No pudimos iniciar sesión. Inténtalo de nuevo en un momento.
            </span>
          )}
          <label className={styles.check}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Mantener la sesión iniciada
          </label>
          <button type="submit" className={styles.primary} disabled={login.isPending}>
            {login.isPending ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className={styles.switchLink}>
          ¿No tienes cuenta? <Link to="/registro">Crear una cuenta</Link>
        </p>
      </div>
    </main>
  )
}
