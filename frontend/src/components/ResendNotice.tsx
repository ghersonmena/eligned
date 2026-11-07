import type { ResendFeedback } from '../hooks/useResendFeedback'
import styles from '../pages/pages.module.css'
import { t } from '../lib/i18n'

export function ResendNotice({ feedback }: { feedback: ResendFeedback }) {
  if (feedback === 'sent') {
    return (
      <p className={styles.success} role="status">
        {t('Si el correo tiene una cuenta pendiente, te enviamos un enlace nuevo.')}
      </p>
    )
  }
  if (feedback === 'too-many') {
    return (
      <p className={styles.error} role="alert">
        {t('Ya pediste varios correos. Espera un minuto antes de intentarlo otra vez.')}
      </p>
    )
  }
  if (feedback === 'error') {
    return (
      <p className={styles.error} role="alert">
        {t('No pudimos enviar el correo. Inténtalo de nuevo en un momento.')}
      </p>
    )
  }
  return null
}
