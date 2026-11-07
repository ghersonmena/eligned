import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { APP_NAME } from '../lib/brand'
import { ResendNotice } from '../components/ResendNotice'
import { useResendFeedback } from '../hooks/useResendFeedback'
import styles from './pages.module.css'
import { t } from '../lib/i18n'

/** After registering (or when a link expired): explains the next step and lets the user resend the email. */
export function CheckEmailPage() {
  const location = useLocation()
  const knownEmail = (location.state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(knownEmail)
  const { resend, feedback } = useResendFeedback()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (email) resend.mutate(email)
  }

  return (
    <main className={styles.authShell}>
      <div className={styles.authCard}>
        <div className={styles.authBrand}>
          <Logo /> {APP_NAME}
        </div>
        <span className={styles.bigIcon} aria-hidden="true">
          <Icon name="mail" size={28} />
        </span>
        <h1 className={styles.authTitle}>
          <span>{t('Un paso más,')}</span> {t('confirma tu correo')}
        </h1>
        {knownEmail ? (
          <p className={styles.lead}>
            {t('Te enviamos un enlace a')} <strong>{knownEmail}</strong>.{' '}
            {t('Ábrelo para activar tu cuenta y después inicia sesión. Si no lo ves, revisa la carpeta de spam.')}
          </p>
        ) : (
          <p className={styles.lead}>{t('Escribe tu correo y te enviamos un enlace nuevo para confirmar tu cuenta.')}</p>
        )}
        <ResendNotice feedback={feedback} />
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {!knownEmail && (
            <label className={styles.field}>
              Correo
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <button type="submit" className={styles.secondary} disabled={resend.isPending || !email}>
            {resend.isPending ? t('Enviando…') : t('Reenviar correo')}
          </button>
        </form>
        <Link to="/login" className={`${styles.primary} ${styles.buttonLink}`}>
          {t('Ir a iniciar sesión')}
        </Link>
      </div>
    </main>
  )
}
