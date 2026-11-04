import type { ResendFeedback } from '../hooks/useResendFeedback'
import styles from '../pages/pages.module.css'

export function ResendNotice({ feedback }: { feedback: ResendFeedback }) {
  if (feedback === 'sent') {
    return (
      <p className={styles.success} role="status">
        Si el correo tiene una cuenta pendiente, te enviamos un enlace nuevo.
      </p>
    )
  }
  if (feedback === 'too-many') {
    return (
      <p className={styles.error} role="alert">
        Ya pediste varios correos. Espera un minuto antes de intentarlo otra vez.
      </p>
    )
  }
  if (feedback === 'error') {
    return (
      <p className={styles.error} role="alert">
        No pudimos enviar el correo. Inténtalo de nuevo en un momento.
      </p>
    )
  }
  return null
}
