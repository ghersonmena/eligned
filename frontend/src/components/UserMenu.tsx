import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { User } from '../api/auth'
import { useLogout } from '../hooks/useAuth'
import { initials } from '../lib/initials'
import { Icon } from './Icon'
import styles from './layout.module.css'

/** Avatar + name in the top bar; opens a menu with account actions. */
export function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const navigate = useNavigate()
  const logout = useLogout()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={styles.userMenu} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.profile}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Cuenta de ${user.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar}>{initials(user.name)}</span>
        <span className={styles.profileName}>{user.name}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div id={menuId} role="menu" className={styles.menu}>
          <div className={styles.menuHeader}>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <Link role="menuitem" to="/ajustes" className={styles.menuItem} onClick={() => setOpen(false)}>
            <Icon name="settings" size={18} />
            Ajustes
          </Link>
          <button
            role="menuitem"
            type="button"
            className={`${styles.menuItem} ${styles.menuDanger}`}
            disabled={logout.isPending}
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })}
          >
            <Icon name="logout" size={18} />
            {logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  )
}
