import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { Logo } from '../components/Logo'
import { useRegister } from '../hooks/useAuth'
import styles from './pages.module.css'

const FIELD_MESSAGES: Record<string, string> = {
  name: 'Escribe tu nombre.',
  email: 'Revisa el correo: puede que ya esté registrado o no sea válido.',
  password: 'La contraseña debe tener al menos 8 caracteres y coincidir con la confirmación.',
}

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })

  const error = register.error instanceof ApiError ? register.error : null
  const fieldError = (field: string) => (error?.fieldError(field) ? FIELD_MESSAGES[field] : undefined)

  function update(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    register.mutate(form, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <main className={styles.authShell}>
      <div className={styles.authCard}>
        <div className={styles.authBrand}>
          <Logo /> [nombre]
        </div>
        <h1 className={styles.authTitle}>
          <span>Empecemos,</span> crea tu cuenta
        </h1>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {(['name', 'email'] as const).map((field) => (
            <label key={field} className={styles.field}>
              {field === 'name' ? 'Nombre' : 'Correo'}
              <input
                className={styles.input}
                type={field === 'email' ? 'email' : 'text'}
                autoComplete={field === 'email' ? 'email' : 'name'}
                required
                value={form[field]}
                onChange={update(field)}
                aria-invalid={fieldError(field) ? true : undefined}
              />
              {fieldError(field) && <span className={styles.error}>{fieldError(field)}</span>}
            </label>
          ))}
          <label className={styles.field}>
            Contraseña
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              aria-invalid={fieldError('password') ? true : undefined}
            />
          </label>
          <label className={styles.field}>
            Repite la contraseña
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              required
              value={form.password_confirmation}
              onChange={update('password_confirmation')}
            />
            {fieldError('password') && <span className={styles.error}>{fieldError('password')}</span>}
          </label>
          {error && error.status !== 422 && (
            <span className={styles.error} role="alert">
              No pudimos crear la cuenta. Inténtalo de nuevo en un momento.
            </span>
          )}
          <button type="submit" className={styles.primary} disabled={register.isPending}>
            {register.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
        <p className={styles.switchLink}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </main>
  )
}
