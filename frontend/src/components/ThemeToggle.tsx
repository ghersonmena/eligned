import { useUpdatePreferences } from '../hooks/useAuth'
import { resolveTheme, useThemeStore } from '../theme/theme'
import { Icon } from './Icon'
import styles from './layout.module.css'
import { t } from '../lib/i18n'

/** Quick light/dark switch for the top bar. "Sistema" lives in Ajustes. */
export function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)
  const updatePreferences = useUpdatePreferences()

  const current = resolveTheme(preference, window.matchMedia('(prefers-color-scheme: dark)').matches)
  const next = current === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={next === 'dark' ? t('Cambiar a tema oscuro') : t('Cambiar a tema claro')}
      onClick={() => {
        setPreference(next)
        updatePreferences.mutate({ theme: next })
      }}
    >
      <Icon name={current === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
