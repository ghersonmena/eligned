import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { AppNotification } from '../../api/types'
import { useNotifications, useReadNotification } from '../../hooks/useWorkspaceData'
import { timeAgo } from '../../lib/activity'
import { Icon } from '../Icon'
import styles from './notifications.module.css'
import { t } from '../../lib/i18n'

const KIND_LABEL: Record<AppNotification['kind'], string> = {
  get reminder() {
    return t('Recordatorio')
  },
  get due_soon() {
    return t('Por vencer')
  },
  get assigned() {
    return t('Asignada')
  },
  get commented() {
    return t('Comentario')
  },
}

/** Bell in the top bar with the unread count and the latest notifications. */
export function NotificationBell() {
  const { data } = useNotifications()
  const read = useReadNotification()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const unread = data?.unread_count ?? 0
  const items = data?.data ?? []

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  function go(n: AppNotification) {
    if (!n.read_at) read.mutate(n.id)
    setOpen(false)
    navigate(`/tareas/${n.task_id}`)
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.bell}
        aria-label={unread ? t('Notificaciones, {n} sin leer', { n: unread }) : t('Notificaciones')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className={styles.panel} role="region" aria-label={t('Notificaciones')}>
          <div className={styles.panelHead}>
            <h2>{t('Notificaciones')}</h2>
            {unread > 0 && (
              <button type="button" className={styles.readAll} onClick={() => read.mutate('all')}>
                {t('Marcar todo como leído')}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className={styles.empty}>{t('Sin notificaciones por ahora. Aquí verás recordatorios, tareas por vencer y comentarios.')}</p>
          ) : (
            <ul className={styles.list}>
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`${styles.item} ${n.read_at ? '' : styles.unread}`} onClick={() => go(n)}>
                    <span className={`${styles.kind} ${styles[n.kind]}`}>{KIND_LABEL[n.kind]}</span>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemBody}>{n.body}</span>
                    <span className={styles.itemTime}>{timeAgo(n.created_at)}</span>
                    {!n.read_at && <span className="visually-hidden">{t('(sin leer)')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
