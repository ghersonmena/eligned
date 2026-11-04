import { useUpdatePreferences } from '../hooks/useAuth'
import { resolveTheme, useThemeStore } from '../theme/theme'
import { Icon } from './Icon'
import styles from './layout.module.css'

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
      aria-label={next === 'dark' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
      onClick={() => {
        setPreference(next)
        updatePreferences.mutate({ theme: next })
      }}
    >
      <Icon name={current === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
