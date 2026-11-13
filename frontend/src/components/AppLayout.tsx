import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import type { User } from '../api/auth'
import { MOBILE_NAV_ITEMS, NAV_ITEMS } from '../navigation'
import { useThemeStore } from '../theme/theme'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { SavingIndicator } from './SavingIndicator'
import { useUpdatePreferences } from '../hooks/useAuth'
import { useRealtime } from '../hooks/useRealtime'
import { takePendingInvitation } from '../lib/pendingInvitation'
import { NotificationBell } from './notifications/NotificationBell'
import { currentWorkspace } from '../lib/workspace'
import { APP_NAME } from '../lib/brand'
import { dateFormat, t, type Locale, useLocaleStore } from '../lib/i18n'
import { Assistant } from './assistant/Assistant'
import { Toasts } from './notifications/Toasts'
import { TimerPill } from './time/TimerPill'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { WhatsNew } from './WhatsNew'
import { APP_VERSION, unseenReleases } from '../lib/changelog'
import styles from './layout.module.css'

/** Board and timeline are views of "Mis tareas", reached from its tabs on phones. */
function mobileActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  if (to === '/tareas' && /^\/(tablero|cronograma)(\/|$)/.test(pathname)) return true
  return pathname === to || pathname.startsWith(`${to}/`)
}


export function AppLayout({ user }: { user: User }) {
  const setPreference = useThemeStore((s) => s.setPreference)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [todayLabel] = useState(() => dateFormat({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))

  useRealtime(user)

  // Back to an invitation opened before signing in.
  useEffect(() => {
    const token = takePendingInvitation()
    if (token) navigate(`/invitacion/${token}`, { replace: true })
  }, [navigate])

  // Alerts are computed on the server in the person's timezone: keep it in sync with this device.
  const updatePreferences = useUpdatePreferences()
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const savedZone = user.preferences.timezone
  const { mutate: savePreferences } = updatePreferences
  useEffect(() => {
    if (deviceZone && savedZone !== deviceZone) savePreferences({ timezone: deviceZone })
  }, [deviceZone, savedZone, savePreferences])

  // Language: the account's choice wins; an account without one keeps this device's.
  const setLocale = useLocaleStore((s) => s.setLocale)
  const localLocale = useLocaleStore((s) => s.locale)
  const savedLocale = user.preferences.locale
  useEffect(() => {
    if (savedLocale) setLocale(savedLocale as Locale)
    else savePreferences({ locale: localLocale })
  }, [savedLocale, localLocale, setLocale, savePreferences])

  // "Esto es lo nuevo": once per version, decided when the app opens.
  const [news, setNews] = useState(() => unseenReleases(user.preferences.seen_version, user.created_at))
  function closeNews() {
    setNews([])
    savePreferences({ seen_version: APP_VERSION })
  }

  // The server copy of the theme wins when it differs (e.g. changed on another device).
  useEffect(() => {
    setPreference(user.preferences.theme)
  }, [user.preferences.theme, setPreference])

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label={t('Principal')}>
        <div className={styles.brand}>
          <Logo />
          <span>{APP_NAME}</span>
        </div>
        <button type="button" className={styles.create} onClick={() => navigate('/tareas/nueva')}>
          <Icon name="plus" size={18} />
          {t('Crear tarea')}
        </button>
        <span className={styles.sectionLabel}>{t('GENERAL')}</span>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.navLink}>
            <Icon name={item.icon} size={18} />
            {t(item.label)}
          </NavLink>
        ))}
        <div className={styles.navFooter}>
          <NavLink to="/ajustes" className={styles.navLink}>
            <Icon name="settings" size={18} />
            {t('Ajustes')}
          </NavLink>
        </div>
      </nav>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.date}>
            <Icon name="calendar" size={18} />
            {todayLabel}
          </span>
          <span className={styles.spacer} />
          <TimerPill />
          <SavingIndicator />
          <NotificationBell />
          <ThemeToggle />
          <span className={styles.divider} />
          <UserMenu user={user} />
        </header>
        <Outlet />
      </div>

      <Toasts />
      {news.length > 0 && <WhatsNew releases={news} onClose={closeNews} />}
      <Assistant canEdit={currentWorkspace(user)?.role !== 'guest'} />

      <nav className={styles.bottomNav} aria-label={t('Principal (móvil)')}>
        {MOBILE_NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={styles.bottomLink}
            aria-current={mobileActive(item.to, pathname) ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            {t(item.shortLabel ?? item.label)}
          </Link>
        ))}
      </nav>
    </div>
  )
}
