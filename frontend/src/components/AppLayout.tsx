import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import type { User } from '../api/auth'
import { MOBILE_NAV_ITEMS, NAV_ITEMS } from '../navigation'
import { useThemeStore } from '../theme/theme'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { SavingIndicator } from './SavingIndicator'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import styles from './layout.module.css'

const today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

export function AppLayout({ user }: { user: User }) {
  const setPreference = useThemeStore((s) => s.setPreference)
  const navigate = useNavigate()
  const [todayLabel] = useState(() => today.format(new Date()))

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
          <SavingIndicator />
          <ThemeToggle />
          <span className={styles.divider} />
          <UserMenu user={user} />
        </header>
        <Outlet />
      </div>

      <nav className={styles.bottomNav} aria-label="Principal (móvil)">
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.bottomLink}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
