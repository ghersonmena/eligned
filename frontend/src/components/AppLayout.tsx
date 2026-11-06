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
import { Assistant } from './assistant/Assistant'
import { Toasts } from './notifications/Toasts'
import { TimerPill } from './time/TimerPill'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import styles from './layout.module.css'

/** Board and timeline are views of "Mis tareas", reached from its tabs on phones. */
function mobileActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  if (to === '/tareas' && /^\/(tablero|cronograma)(\/|$)/.test(pathname)) return true
  return pathname === to || pathname.startsWith(`${to}/`)
}

const today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

export function AppLayout({ user }: { user: User }) {
  const setPreference = useThemeStore((s) => s.setPreference)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [todayLabel] = useState(() => today.format(new Date()))

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

  // The server copy of the theme wins when it differs (e.g. changed on another device).
  useEffect(() => {
    setPreference(user.preferences.theme)
  }, [user.preferences.theme, setPreference])

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Principal">
        <div className={styles.brand}>
          <Logo />
          <span>[nombre]</span>
        </div>
        <button type="button" className={styles.create} onClick={() => navigate('/tareas/nueva')}>
          <Icon name="plus" size={18} />
          Crear tarea
        </button>
        <span className={styles.sectionLabel}>GENERAL</span>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.navLink}>
            <Icon name={item.icon} size={18} />
            {item.label}
          </NavLink>
        ))}
        <div className={styles.navFooter}>
          <NavLink to="/ajustes" className={styles.navLink}>
            <Icon name="settings" size={18} />
            Ajustes
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
      <Assistant canEdit={currentWorkspace(user)?.role !== 'guest'} />

      <nav className={styles.bottomNav} aria-label="Principal (móvil)">
        {MOBILE_NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={styles.bottomLink}
            aria-current={mobileActive(item.to, pathname) ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            {item.shortLabel ?? item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
