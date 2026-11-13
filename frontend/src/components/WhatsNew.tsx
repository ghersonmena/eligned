import { useEffect, useRef } from 'react'
import type { Release } from '../lib/changelog'
import { dateFormat, t } from '../lib/i18n'
import { parseDayKey } from '../lib/dates'
import styles from './WhatsNew.module.css'

/** "Esto es lo nuevo": what changed in the given releases (newest first). */
export function WhatsNew({ releases, onClose }: { releases: Release[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const day = dateFormat({ day: 'numeric', month: 'long', year: 'numeric' })

  return (
    // Esc and the button both end in onClose (the dialog's "close" event).
    <dialog ref={ref} className={styles.dialog} aria-labelledby="whats-new-title" onClose={onClose}>
      <h2 id="whats-new-title" className={styles.title}>
        {t('Esto es lo nuevo')}
      </h2>
      <div className={styles.body}>
        {releases.map((release) => (
          <section key={release.version} className={styles.release}>
            <p className={styles.version}>
              {t('Versión {version}', { version: release.version })} · {day.format(parseDayKey(release.date))}
            </p>
            <ul className={styles.changes}>
              {release.changes.map((change) => (
                <li key={change.title}>
                  <strong>{t(change.title)}</strong>
                  <span>{t(change.text)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <form method="dialog" className={styles.actions}>
        <button type="submit" className={styles.ok} autoFocus>
          {t('Entendido')}
        </button>
      </form>
    </dialog>
  )
}
