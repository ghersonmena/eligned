import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '../Icon'
import styles from './toasts.module.css'
import { useToasts, type Toast } from './toasts'
import { t } from '../../lib/i18n'

const LABEL: Record<Toast['kind'], string> = {
  get reminder() {
    return t('Recordatorio')
  },
  get due_soon() {
    return t('Por vencer')
  },
  get assigned() {
    return t('Te asignaron')
  },
  get commented() {
    return t('Nuevo comentario')
  },
}

const VISIBLE_MS = 9000

/** Popups for notifications that arrive while the app is open (corner on desktop, top center on phones). */
export function Toasts() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div className={styles.stack} aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss)
  const navigate = useNavigate()

  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), VISIBLE_MS)
    return () => window.clearTimeout(id)
  }, [toast.id, dismiss])

  return (
    <div className={`${styles.toast} ${styles[toast.kind]}`} role="status">
      <button
        type="button"
        className={styles.open}
        onClick={() => {
          dismiss(toast.id)
          navigate(`/tareas/${toast.task_id}`)
        }}
      >
        <span className={styles.kind}>
          <Icon name="bell" size={14} /> {LABEL[toast.kind]}
        </span>
        <span className={styles.title}>{toast.title}</span>
        <span className={styles.body}>{toast.body}</span>
      </button>
      <button type="button" className={styles.close} aria-label={t('Cerrar aviso')} onClick={() => dismiss(toast.id)}>
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
