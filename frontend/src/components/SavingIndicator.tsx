import { useIsMutating } from '@tanstack/react-query'
import styles from './layout.module.css'
import { t } from '../lib/i18n'

/** Small "Guardando…" pill in the top bar while any change is being sent. */
export function SavingIndicator() {
  const saving = useIsMutating() > 0
  return (
    <span className={styles.saving} role="status" aria-live="polite">
      {saving && (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          {t('Guardando…')}
        </>
      )}
    </span>
  )
}
