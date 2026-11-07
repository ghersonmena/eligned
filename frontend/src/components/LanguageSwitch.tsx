import { LOCALES, t, useLocaleStore } from '../lib/i18n'
import styles from './layout.module.css'

/** "Español · English" for visitors (sign in, sign up). Signed-in people choose in Ajustes. */
export function LanguageSwitch() {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  return (
    <div className={styles.langSwitch} role="group" aria-label={t('Cambiar idioma')}>
      {LOCALES.map((l) => (
        <button key={l.value} type="button" lang={l.value} aria-pressed={locale === l.value} onClick={() => setLocale(l.value)}>
          {l.label}
        </button>
      ))}
    </div>
  )
}
