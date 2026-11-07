import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, sendTestPush, serverConfig, type PushState } from '../../lib/push'
import styles from '../../pages/pages.module.css'
import { t, tk } from '../../lib/i18n'

const TEXT: Record<PushState, string> = {
  on: tk('Activas en este dispositivo. Te llegan aunque la app esté cerrada.'),
  off: tk('Desactivadas en este dispositivo.'),
  denied: tk('El navegador las tiene bloqueadas para este sitio. Permítelas desde la configuración del navegador (icono junto a la dirección).'),
  unsupported: tk('Este navegador no admite notificaciones push. En iPhone, primero instala la app en la pantalla de inicio.'),
  insecure: tk('Las notificaciones push necesitan una conexión segura (HTTPS). Funcionarán cuando la app esté en tu servidor con HTTPS.'),
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
      setMessage(t('No se pudo completar. Inténtalo de nuevo.'))
    } finally {
      setBusy(false)
    }
  }

  if (!state) return null
  const canToggle = state === 'on' || state === 'off'

  return (
    <div className={styles.row}>
      <span>
        <strong>{t('Notificaciones push')}</strong>
        <small>{t(TEXT[state])}</small>
        {message && (
          <small role="status" className={styles.pushMessage}>
            {message}
          </small>
        )}
      </span>
      {canToggle && (
        <div className={styles.settingInline}>
          {state === 'on' && (
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => run(() => sendTestPush(), t('Enviada. Debe aparecer en unos segundos.'))}>
              {t('Probar')}
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={state === 'on'}
            aria-label={t('Notificaciones push en este dispositivo')}
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
