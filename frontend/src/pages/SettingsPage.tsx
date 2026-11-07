import { useNavigate } from 'react-router'
import type { ThemePreference, User } from '../api/auth'
import { VoiceSettings } from '../components/assistant/VoiceSettings'
import { PushSettings } from '../components/notifications/PushSettings'
import { useLogout, useUpdatePreferences } from '../hooks/useAuth'
import { AUTHOR, AUTHOR_URL, LICENSE_NAME, LICENSE_URL, REPO_URL } from '../lib/about'
import { LOCALES, t, tk, type Locale, useLocaleStore } from '../lib/i18n'
import { useThemeStore } from '../theme/theme'
import styles from './pages.module.css'

const THEMES: { value: ThemePreference; label: string; left: string; right: string }[] = [
  { value: 'light', label: tk('Claro'), left: '#FFFFFF', right: '#F4EEE8' },
  { value: 'dark', label: tk('Oscuro'), left: '#211915', right: '#0A0706' },
  { value: 'system', label: tk('Sistema'), left: '#FFFFFF', right: '#0A0706' },
]

export function SettingsPage({ user }: { user: User }) {
  const navigate = useNavigate()
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)
  const updatePreferences = useUpdatePreferences()
  const logout = useLogout()

  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  function chooseLocale(next: Locale) {
    updatePreferences.mutate({ locale: next })
    setLocale(next)
  }

  function chooseTheme(theme: ThemePreference) {
    setPreference(theme)
    updatePreferences.mutate({ theme })
  }

  return (
    <>
      <h1 className={styles.pageTitle}>{t('Ajustes')}</h1>
      <section className={styles.card}>
        <h2>{t('Apariencia')}</h2>
        <p>{t('Elige cómo se ve la app. "Sistema" sigue la configuración de tu equipo.')}</p>
        <div role="radiogroup" aria-label={t('Tema')} className={styles.segmented}>
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
              {t(theme.label)}
            </button>
          ))}
        </div>
        <label className={styles.row}>
          <span>
            <strong>{t('Idioma')}</strong>
            <small>{t('Para toda la app y los avisos que te llegan.')}</small>
          </span>
          <select className={styles.settingSelect} value={locale} onChange={(e) => chooseLocale(e.target.value as Locale)}>
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value} lang={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.row}>
          <span>
            <strong>{t('Animación al completar tareas')}</strong>
            <small>{t('Confeti y aviso de logro.')}</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={user.preferences.confetti}
            aria-label={t('Animación al completar tareas')}
            className={styles.switch}
            onClick={() => updatePreferences.mutate({ confetti: !user.preferences.confetti })}
          >
            <span />
          </button>
        </div>
      </section>
      <section className={styles.card}>
        <h2>{t('Notificaciones')}</h2>
        <p>{t('Los avisos llegan a la campana de arriba. Puedes poner recordatorios propios en cada tarea.')}</p>
        <label className={styles.row}>
          <span>
            <strong>{t('Tareas con hora')}</strong>
            <small>{t('Avisarme antes de que venzan.')}</small>
          </span>
          <select
            className={styles.settingSelect}
            value={user.preferences.due_notice_minutes ?? ''}
            onChange={(e) => updatePreferences.mutate({ due_notice_minutes: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">{t('No avisar')}</option>
            <option value="5">{t('5 min antes')}</option>
            <option value="15">{t('15 min antes')}</option>
            <option value="30">{t('30 min antes')}</option>
            <option value="60">{t('1 hora antes')}</option>
            <option value="120">{t('2 horas antes')}</option>
            <option value="1440">{t('1 día antes')}</option>
          </select>
        </label>
        <div className={styles.row}>
          <span>
            <strong>{t('Tareas de todo el día')}</strong>
            <small>{t('Un aviso la mañana del día que vencen.')}</small>
          </span>
          <div className={styles.settingInline}>
            {user.preferences.all_day_notice && (
              <input
                type="time"
                className={styles.settingSelect}
                aria-label={t('Hora del aviso')}
                defaultValue={user.preferences.all_day_notice_time}
                onBlur={(e) => {
                  if (e.target.value && e.target.value !== user.preferences.all_day_notice_time) {
                    updatePreferences.mutate({ all_day_notice_time: e.target.value })
                  }
                }}
              />
            )}
            <button
              type="button"
              role="switch"
              aria-checked={user.preferences.all_day_notice}
              aria-label={t('Aviso de tareas de todo el día')}
              className={styles.switch}
              onClick={() => updatePreferences.mutate({ all_day_notice: !user.preferences.all_day_notice })}
            >
              <span />
            </button>
          </div>
        </div>
        <div className={styles.row}>
          <span>
            <strong>{t('Avisos emergentes')}</strong>
            <small>{t('Muestra cada aviso en una ventanita mientras usas la app.')}</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={user.preferences.popups}
            aria-label={t('Avisos emergentes')}
            className={styles.switch}
            onClick={() => updatePreferences.mutate({ popups: !user.preferences.popups })}
          >
            <span />
          </button>
        </div>
        <PushSettings />
        <p className={styles.settingNote}>{t('Zona horaria: {zone}', { zone: user.preferences.timezone })}</p>
      </section>
      <VoiceSettings />
      <section className={styles.card}>
        <h2>{t('Cuenta')}</h2>
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
            {t('Cerrar sesión')}
          </button>
        </div>
      </section>
      <section className={styles.card}>
        <h2>{t('Acerca de eLigned')}</h2>
        <div className={styles.row}>
          <span>
            <strong>{t('Autoría')}</strong>
            <small>{t('Creada por {author}.', { author: AUTHOR })}</small>
          </span>
          <a className={styles.secondaryLink} href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
            {t('Perfil')}
          </a>
        </div>
        <div className={styles.row}>
          <span>
            <strong>{t('Licencia: {license}', { license: LICENSE_NAME })}</strong>
            <small>
              {t(
                'Es software libre: puedes usarla, estudiarla, modificarla y compartirla. Si ofreces una versión modificada por internet, debes publicar su código con esta misma licencia.',
              )}
            </small>
          </span>
          <a className={styles.secondaryLink} href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
            {t('Leer')}
          </a>
        </div>
        <div className={styles.row}>
          <span>
            <strong>{t('Código fuente')}</strong>
            <small>{t('Todo el código de la app está publicado en GitHub.')}</small>
          </span>
          <a className={styles.secondaryLink} href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {t('Ver el repositorio')}
          </a>
        </div>
      </section>
    </>
  )
}
