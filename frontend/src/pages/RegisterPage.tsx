import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { Logo } from '../components/Logo'
import { APP_NAME } from '../lib/brand'
import { PasswordInput } from '../components/PasswordInput'
import { useRegister } from '../hooks/useAuth'
import styles from './pages.module.css'
import { t, tk } from '../lib/i18n'

const FIELD_MESSAGES: Record<string, string> = {
  name: tk('Escribe tu nombre.'),
  email: tk('Revisa el correo: puede que ya esté registrado o no sea válido.'),
  password: tk('La contraseña debe tener al menos 8 caracteres y coincidir con la confirmación.'),
}

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()
  const [params] = useSearchParams()
  // Coming from an invitation: the address it was sent to.
  const [form, setForm] = useState({ name: '', email: params.get('email') ?? '', password: '', password_confirmation: '' })

  const error = register.error instanceof ApiError ? register.error : null
  const fieldError = (field: string) => (error?.fieldError(field) ? t(FIELD_MESSAGES[field]) : undefined)

  function update(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    register.mutate(form, {
      onSuccess: (result) => navigate('/revisa-tu-correo', { replace: true, state: { email: result.email } }),
    })
  }

  return (
    <main className={styles.authShell}>
      <div className={styles.authCard}>
        <div className={styles.authBrand}>
          <Logo /> {APP_NAME}
        </div>
        <h1 className={styles.authTitle}>
          <span>{t('Empecemos,')}</span> {t('crea tu cuenta')}
        </h1>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {(['name', 'email'] as const).map((field) => (
            <label key={field} className={styles.field}>
              {field === 'name' ? t('Nombre') : t('Correo')}
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
            {t('Contraseña')}
            <PasswordInput
              className={styles.input}
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              aria-invalid={fieldError('password') ? true : undefined}
            />
          </label>
          <label className={styles.field}>
            {t('Repite la contraseña')}
            <PasswordInput
              className={styles.input}
              autoComplete="new-password"
              required
              value={form.password_confirmation}
              onChange={update('password_confirmation')}
            />
            {fieldError('password') && <span className={styles.error}>{fieldError('password')}</span>}
          </label>
          {error && error.status !== 422 && (
            <span className={styles.error} role="alert">
              {t('No pudimos crear la cuenta. Inténtalo de nuevo en un momento.')}
            </span>
          )}
          <button type="submit" className={styles.primary} disabled={register.isPending}>
            {register.isPending ? t('Creando cuenta…') : t('Crear cuenta')}
          </button>
        </form>
        <LanguageSwitch />
        <p className={styles.switchLink}>
          {t('¿Ya tienes cuenta?')} <Link to="/login">{t('Inicia sesión')}</Link>
        </p>
      </div>
    </main>
  )
}
