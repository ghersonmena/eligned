import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, sendTestPush, serverConfig, type PushState } from '../../lib/push'
import styles from '../../pages/pages.module.css'

const TEXT: Record<PushState, string> = {
  on: 'Activas en este dispositivo. Te llegan aunque la app esté cerrada.',
  off: 'Desactivadas en este dispositivo.',
  denied: 'El navegador las tiene bloqueadas para este sitio. Permítelas desde la configuración del navegador (icono junto a la dirección).',
  unsupported: 'Este navegador no admite notificaciones push. En iPhone, primero instala la app en la pantalla de inicio.',
  insecure: 'Las notificaciones push necesitan una conexión segura (HTTPS). Funcionarán cuando la app esté en tu servidor con HTTPS.',
}

/** Settings: turn push on/off for this browser and send a test. */
export function PushSettings() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void pushState().then(setState)
  }, [])

  async function run(action: () => Promise<PushState | void>, done?: string) {
    setBusy(true)
    setMessage('')
    try {
      const next = await action()
      if (next) setState(next)
      if (done) setMessage(done)
    } catch {
      setMessage('No se pudo completar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (!state) return null
  const canToggle = state === 'on' || state === 'off'

  return (
    <div className={styles.row}>
      <span>
        <strong>Notificaciones push</strong>
        <small>{TEXT[state]}</small>
        {message && (
          <small role="status" className={styles.pushMessage}>
            {message}
          </small>
        )}
      </span>
      {canToggle && (
        <div className={styles.settingInline}>
          {state === 'on' && (
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => run(() => sendTestPush(), 'Enviada. Debe aparecer en unos segundos.')}>
              Probar
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={state === 'on'}
            aria-label="Notificaciones push en este dispositivo"
            className={styles.switch}
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (state === 'on') return disablePush()
                const key = (await serverConfig()).push?.public_key
                if (!key) throw new Error('push off')
                return enablePush(key)
              })
            }
          >
            <span />
          </button>
        </div>
      )}
    </div>
  )
}
