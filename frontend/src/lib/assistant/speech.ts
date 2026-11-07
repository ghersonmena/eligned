/**
 * The browser's own speech: listening (SpeechRecognition, Chrome / Edge /
 * Safari / Android) and talking (speechSynthesis). Nothing is sent to our
 * server; the browser may use its maker's service to turn voice into text.
 */

interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}

interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const canListen = () => typeof window !== 'undefined' && !!recognitionCtor()
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export type ListenError = 'denied' | 'no-speech' | 'network' | 'other'

export interface Listener {
  stop(): void
  abort(): void
}

/** Listens for one phrase. `onPartial` shows the words as they come. */
export function listen(handlers: {
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onError: (error: ListenError) => void
  onEnd: () => void
}): Listener | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null
  const r = new Ctor()
  r.lang = 'es-MX'
  r.continuous = false
  r.interimResults = true
  r.maxAlternatives = 1
  let final = ''
  r.onresult = (e) => {
    let partial = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) final += res[0].transcript
      else partial += res[0].transcript
    }
    handlers.onPartial((final + partial).trim())
  }
  r.onerror = (e) => {
    if (e.error === 'aborted') return
    handlers.onError(
      e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'denied'
        : e.error === 'no-speech'
          ? 'no-speech'
          : e.error === 'network'
            ? 'network'
            : 'other',
    )
  }
  r.onend = () => {
    if (final.trim()) handlers.onFinal(final.trim())
    handlers.onEnd()
  }
  try {
    r.start()
  } catch {
    return null
  }
  return { stop: () => r.stop(), abort: () => r.abort() }
}

/* ---------- Talking ---------- */

export interface VoiceLike {
  name: string
  lang: string
}

/** Neural / downloaded voices sound almost human (Edge "Natural", Apple "Premium"/"Mejorada"…). */
const NATURAL = /natural|neural|online|premium|mejorad|enhanced|siri|wavenet/i
// Spanish women's voices, by the names browsers give them.
const FEMALE = /dalia|paulina|sabina|m[oó]nica|helena|laura|elvira|dalia|lupe|paloma|marisol|ximena|elena|larissa|salom[eé]|catalina|camila|sof[ií]a|valentina|google español/i

const COUNTRIES: Record<string, string> = {
  MX: 'México',
  US: 'Estados Unidos',
  ES: 'España',
  AR: 'Argentina',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Perú',
  VE: 'Venezuela',
  '419': 'Latinoamérica',
}

export const isNatural = (v: VoiceLike) => NATURAL.test(v.name)

function rank(v: VoiceLike): number {
  const lang = v.lang.replace('_', '-')
  const region = lang === 'es-MX' ? 4 : lang === 'es-US' ? 3 : lang === 'es-419' ? 2 : lang === 'es-ES' ? 1 : 0
  return (isNatural(v) ? 10 : 0) + region + (FEMALE.test(v.name) ? 2 : 0)
}

/** Spanish voices, the most natural and closest to Mexico first. */
export function rankVoices<V extends VoiceLike>(voices: V[]): V[] {
  return voices.filter((v) => v.lang.toLowerCase().startsWith('es')).sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name))
}

/** "Microsoft Dalia Online (Natural) - Spanish (Mexico)" → "Dalia · México". */
export function voiceLabel(v: VoiceLike): string {
  const name =
    v.name
      .replace(/^(Microsoft|Google|Apple)\s+/i, '')
      .replace(/\s*-\s*Spanish.*$/i, '')
      .replace(/\s*\((natural|enhanced|premium|mejorada)\)/gi, '')
      .replace(/\s*online/i, '')
      .trim() || v.name
  const region = v.lang.replace('_', '-').split('-')[1]?.toUpperCase()
  const country = region ? COUNTRIES[region] : undefined
  return country && !name.toLowerCase().includes(country.toLowerCase()) ? `${name} · ${country}` : name
}

/* Per device: each device has its own voices. */
const ENABLED_KEY = 'asistente.voz'
const NAME_KEY = 'asistente.vozNombre'
const RATE_KEY = 'asistente.velocidad'

export interface VoiceSettings {
  enabled: boolean
  /** Chosen voice, or null for the best one available. */
  name: string | null
  rate: number
}

export function readVoiceSettings(): VoiceSettings {
  try {
    const rate = Number(localStorage.getItem(RATE_KEY))
    return {
      enabled: localStorage.getItem(ENABLED_KEY) !== 'off',
      name: localStorage.getItem(NAME_KEY) || null,
      rate: rate >= 0.6 && rate <= 1.6 ? rate : 1,
    }
  } catch {
    return { enabled: true, name: null, rate: 1 }
  }
}

export function saveVoiceSettings(next: Partial<VoiceSettings>) {
  try {
    if (next.enabled !== undefined) localStorage.setItem(ENABLED_KEY, next.enabled ? 'on' : 'off')
    if (next.name !== undefined) {
      if (next.name) localStorage.setItem(NAME_KEY, next.name)
      else localStorage.removeItem(NAME_KEY)
    }
    if (next.rate !== undefined) localStorage.setItem(RATE_KEY, String(next.rate))
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}

export function spanishVoices(): SpeechSynthesisVoice[] {
  return canSpeak() ? rankVoices(window.speechSynthesis.getVoices()) : []
}

/** The saved voice if this device has it, otherwise the best Spanish one. */
function chosenVoice(name: string | null): SpeechSynthesisVoice | null {
  const voices = spanishVoices()
  return (name && voices.find((v) => v.name === name)) || voices[0] || null
}

/** Says `text` out loud; `onDone` runs when it finishes (or right away if it can't talk). */
export function speak(text: string, onDone?: () => void, override?: { name?: string | null; rate?: number }) {
  if (!canSpeak()) {
    onDone?.()
    return
  }
  const settings = readVoiceSettings()
  const synth = window.speechSynthesis
  synth.cancel()
  const voice = chosenVoice(override?.name !== undefined ? override.name : settings.name)
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang ?? 'es-MX'
  if (voice) u.voice = voice
  u.rate = override?.rate ?? settings.rate
  let done = false
  const finish = () => {
    if (done) return
    done = true
    window.clearTimeout(guard)
    onDone?.()
  }
  // Some browsers never fire "end": don't stay waiting forever.
  const guard = window.setTimeout(finish, 1500 + (text.length * 90) / u.rate)
  u.onend = finish
  u.onerror = finish
  synth.speak(u)
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
