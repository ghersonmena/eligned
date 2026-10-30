import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { Logo } from '../components/Logo'
import { PasswordInput } from '../components/PasswordInput'
import { useLogin } from '../hooks/useAuth'
import styles from './pages.module.css'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const error = login.error instanceof ApiError ? login.error : null
  const emailError = error?.fieldError('email') ? 'El correo o la contraseña no son correctos.' : undefined

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
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'login-error' : undefined}
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
          {emailError && (
            <span id="login-error" className={styles.error} role="alert">
              {emailError}
            </span>
          )}
          {error && !emailError && (
            <span className={styles.error} role="alert">
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
