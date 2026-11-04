import { useNavigate } from 'react-router'
import type { ThemePreference, User } from '../api/auth'
import { useLogout, useUpdatePreferences } from '../hooks/useAuth'
import { useThemeStore } from '../theme/theme'
import styles from './pages.module.css'

const THEMES: { value: ThemePreference; label: string; left: string; right: string }[] = [
  { value: 'light', label: 'Claro', left: '#FFFFFF', right: '#F4EEE8' },
  { value: 'dark', label: 'Oscuro', left: '#211915', right: '#0A0706' },
  { value: 'system', label: 'Sistema', left: '#FFFFFF', right: '#0A0706' },
]

export function SettingsPage({ user }: { user: User }) {
  const navigate = useNavigate()
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)
  const updatePreferences = useUpdatePreferences()
  const logout = useLogout()

  function chooseTheme(theme: ThemePreference) {
    setPreference(theme)
    updatePreferences.mutate({ theme })
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Ajustes</h1>
      <section className={styles.card}>
        <h2>Apariencia</h2>
        <p>Elige cómo se ve la app. "Sistema" sigue la configuración de tu equipo.</p>
        <div role="radiogroup" aria-label="Tema" className={styles.segmented}>
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              role="radio"
              aria-checked={preference === theme.value}
              className={styles.themeOption}
              onClick={() => chooseTheme(theme.value)}
            >
              <span className={styles.swatch} aria-hidden="true">
                <span style={{ background: theme.left }} />
                <span style={{ background: theme.right }} />
              </span>
              {theme.label}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <span>
            <strong>Animación al completar tareas</strong>
            <small>Confeti y aviso de logro.</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={user.preferences.confetti}
            aria-label="Animación al completar tareas"
            className={styles.switch}
            onClick={() => updatePreferences.mutate({ confetti: !user.preferences.confetti })}
          >
            <span />
          </button>
        </div>
      </section>
      <section className={styles.card}>
        <h2>Cuenta</h2>
        <p>
          {user.name} · {user.email}
        </p>
        <div>
          <button
            type="button"
            className={styles.secondary}
            disabled={logout.isPending}
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })}
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </>
  )
}
