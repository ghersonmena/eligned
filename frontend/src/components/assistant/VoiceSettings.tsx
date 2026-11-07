import { useEffect, useState, useSyncExternalStore } from 'react'
import { canListen, canSpeak, isNatural, readVoiceSettings, saveVoiceSettings, speak, spanishVoices, stopSpeaking, voiceLabel } from '../../lib/assistant/speech'
import { getLocale, t } from '../../lib/i18n'
import styles from '../../pages/pages.module.css'
import voice from './voice.module.css'

// The assistant talks Spanish, so the sample is Spanish in every language.
const SAMPLE = 'Hola, soy tu asistente. ¿Guardo la tarea: ir a la cita con mi esposa, para hoy a las 5 de la tarde?'

/* Browsers load their voices a moment after the page; this re-renders when they arrive. */
function subscribe(onChange: () => void) {
  if (!canSpeak()) return () => {}
  window.speechSynthesis.addEventListener('voiceschanged', onChange)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', onChange)
}
let cache: { key: string; list: SpeechSynthesisVoice[] } = { key: '', list: [] }
function snapshot() {
  const list = spanishVoices()
  const key = list.map((v) => v.name).join('|')
  if (key !== cache.key) cache = { key, list }
  return cache.list
}

function platformTip(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|Macintosh/.test(ua) && !/Edg\//.test(ua))
    return t(
      'En iPhone o Mac puedes descargar voces más naturales: Ajustes → Accesibilidad → Contenido leído → Voces → Español (México) → "Paulina (Mejorada)" o "Mónica (Premium)". Luego vuelve aquí y elígela.',
    )
  if (/Android/.test(ua)) return t('En Android puedes instalar voces de mejor calidad en Ajustes → Sistema → Idioma → Texto a voz → Servicios de voz de Google → Instalar datos de voz → Español.')
  if (/Edg\//.test(ua)) return t('Edge incluye voces "Natural" (como Dalia o Jorge); necesitan conexión a internet para hablar.')
  return t('Las voces más realistas gratis vienen en Microsoft Edge (voces "Natural") y en iPhone/Mac (voces "Mejorada" o "Premium").')
}

/** Ajustes → Asistente de voz: which voice talks, how fast, and whether it talks at all. Saved on this device. */
export function VoiceSettings() {
  const voices = useSyncExternalStore(subscribe, snapshot, () => [])
  const [settings, setSettings] = useState(readVoiceSettings)
  const [playing, setPlaying] = useState(false)

  useEffect(() => () => stopSpeaking(), [])

  function update(next: Partial<typeof settings>) {
    saveVoiceSettings(next)
    setSettings((s) => ({ ...s, ...next }))
  }

  function preview(name = settings.name, rate = settings.rate) {
    setPlaying(true)
    speak(SAMPLE, () => setPlaying(false), { name, rate })
  }

  const natural = voices.filter(isNatural)
  const others = voices.filter((v) => !isNatural(v))
  const best = voices[0]
  const chosenMissing = settings.name && voices.length > 0 && !voices.some((v) => v.name === settings.name)

  return (
    <section className={styles.card} aria-labelledby="voice-title">
      <h2 id="voice-title">{t('Asistente de voz')}</h2>
      <p>
        {t('El botón del micrófono, abajo a la derecha, crea tareas y te dice qué tienes pendiente.')}
        {getLocale() !== 'es' && ` ${t('Por ahora entiende y habla solo español.')}`}
        {!canListen() && ` ${t('Este navegador no puede escucharte (Firefox no lo permite), pero puedes escribirle.')}`}
      </p>

      {!canSpeak() ? (
        <p className={styles.settingNote}>{t('Este navegador no puede leer respuestas en voz alta.')}</p>
      ) : (
        <>
          <div className={styles.row}>
            <span>
              <strong>{t('Responder en voz alta')}</strong>
              <small>{t('Si lo apagas, solo responde por escrito.')}</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              aria-label={t('Responder en voz alta')}
              className={styles.switch}
              onClick={() => update({ enabled: !settings.enabled })}
            >
              <span />
            </button>
          </div>

          <label className={`${styles.row} ${voice.voiceRow}`}>
            <span>
              <strong>{t('Voz')}</strong>
              <small>{natural.length === 0
                  ? t('Elige la que más te guste.')
                  : natural.length === 1
                    ? t('Tienes 1 voz natural en este dispositivo.')
                    : t('Tienes {n} voces naturales en este dispositivo.', { n: natural.length })}</small>
            </span>
            <select
              className={styles.settingSelect}
              value={settings.name ?? ''}
              onChange={(e) => {
                const name = e.target.value || null
                update({ name })
                preview(name)
              }}
            >
              <option value="">
                {t('Automática')}
                {best ? ` (${voiceLabel(best)})` : ''}
              </option>
              {natural.length > 0 && (
                <optgroup label={t('Naturales (más realistas)')}>
                  {natural.map((v) => (
                    <option key={v.name} value={v.name}>
                      {voiceLabel(v)}
                    </option>
                  ))}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label={natural.length > 0 ? t('Otras') : t('Voces en español')}>
                  {others.map((v) => (
                    <option key={v.name} value={v.name}>
                      {voiceLabel(v)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {chosenMissing && <p className={styles.settingNote}>{t('La voz que elegiste ya no está en este dispositivo; se usa la automática.')}</p>}

          <label className={styles.row}>
            <span>
              <strong>{t('Velocidad')}</strong>
              <small>{settings.rate === 1 ? t('Normal') : settings.rate < 1 ? t('Más lenta') : t('Más rápida')} · {settings.rate.toFixed(2).replace(/0$/, '')}×</small>
            </span>
            <input
              type="range"
              className={voice.rate}
              min={0.75}
              max={1.4}
              step={0.05}
              value={settings.rate}
              aria-label={t('Velocidad de la voz')}
              onChange={(e) => update({ rate: Number(e.target.value) })}
              onPointerUp={() => preview()}
              onKeyUp={(e) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && preview()}
            />
          </label>

          <div className={styles.settingInline}>
            <button type="button" className={styles.secondary} onClick={() => (playing ? (stopSpeaking(), setPlaying(false)) : preview())}>
              {playing ? t('Detener') : `▶ ${t('Escuchar ejemplo')}`}
            </button>
          </div>

          {voices.length === 0 ? (
            <p className={styles.settingNote}>
              {t('Este dispositivo no tiene voces en español instaladas.')} {platformTip()}
            </p>
          ) : (
            natural.length === 0 && <p className={styles.settingNote}>💡 {platformTip()}</p>
          )}
        </>
      )}
    </section>
  )
}
