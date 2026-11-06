import { useEffect, useState, useSyncExternalStore } from 'react'
import { canListen, canSpeak, isNatural, readVoiceSettings, saveVoiceSettings, speak, spanishVoices, stopSpeaking, voiceLabel } from '../../lib/assistant/speech'
import styles from '../../pages/pages.module.css'
import voice from './voice.module.css'

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
    return 'En iPhone o Mac puedes descargar voces más naturales: Ajustes → Accesibilidad → Contenido leído → Voces → Español (México) → "Paulina (Mejorada)" o "Mónica (Premium)". Luego vuelve aquí y elígela.'
  if (/Android/.test(ua)) return 'En Android puedes instalar voces de mejor calidad en Ajustes → Sistema → Idioma → Texto a voz → Servicios de voz de Google → Instalar datos de voz → Español.'
  if (/Edg\//.test(ua)) return 'Edge incluye voces "Natural" (como Dalia o Jorge); necesitan conexión a internet para hablar.'
  return 'Las voces más realistas gratis vienen en Microsoft Edge (voces "Natural") y en iPhone/Mac (voces "Mejorada" o "Premium").'
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
      <h2 id="voice-title">Asistente de voz</h2>
      <p>
        El botón del micrófono, abajo a la derecha, crea tareas y te dice qué tienes pendiente.
        {!canListen() && ' Este navegador no puede escucharte (Firefox no lo permite), pero puedes escribirle.'}
      </p>

      {!canSpeak() ? (
        <p className={styles.settingNote}>Este navegador no puede leer respuestas en voz alta.</p>
      ) : (
        <>
          <div className={styles.row}>
            <span>
              <strong>Responder en voz alta</strong>
              <small>Si lo apagas, solo responde por escrito.</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              aria-label="Responder en voz alta"
              className={styles.switch}
              onClick={() => update({ enabled: !settings.enabled })}
            >
              <span />
            </button>
          </div>

          <label className={`${styles.row} ${voice.voiceRow}`}>
            <span>
              <strong>Voz</strong>
              <small>{natural.length > 0 ? `Tienes ${natural.length === 1 ? '1 voz natural' : `${natural.length} voces naturales`} en este dispositivo.` : 'Elige la que más te guste.'}</small>
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
              <option value="">Automática{best ? ` (${voiceLabel(best)})` : ''}</option>
              {natural.length > 0 && (
                <optgroup label="Naturales (más realistas)">
                  {natural.map((v) => (
                    <option key={v.name} value={v.name}>
                      {voiceLabel(v)}
                    </option>
                  ))}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label={natural.length > 0 ? 'Otras' : 'Voces en español'}>
                  {others.map((v) => (
                    <option key={v.name} value={v.name}>
                      {voiceLabel(v)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {chosenMissing && <p className={styles.settingNote}>La voz que elegiste ya no está en este dispositivo; se usa la automática.</p>}

          <label className={styles.row}>
            <span>
              <strong>Velocidad</strong>
              <small>{settings.rate === 1 ? 'Normal' : settings.rate < 1 ? 'Más lenta' : 'Más rápida'} · {settings.rate.toFixed(2).replace(/0$/, '')}×</small>
            </span>
            <input
              type="range"
              className={voice.rate}
              min={0.75}
              max={1.4}
              step={0.05}
              value={settings.rate}
              aria-label="Velocidad de la voz"
              onChange={(e) => update({ rate: Number(e.target.value) })}
              onPointerUp={() => preview()}
              onKeyUp={(e) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && preview()}
            />
          </label>

          <div className={styles.settingInline}>
            <button type="button" className={styles.secondary} onClick={() => (playing ? (stopSpeaking(), setPlaying(false)) : preview())}>
              {playing ? 'Detener' : '▶ Escuchar ejemplo'}
            </button>
          </div>

          {voices.length === 0 ? (
            <p className={styles.settingNote}>Este dispositivo no tiene voces en español instaladas. {platformTip()}</p>
          ) : (
            natural.length === 0 && <p className={styles.settingNote}>💡 {platformTip()}</p>
          )}
        </>
      )}
    </section>
  )
}
