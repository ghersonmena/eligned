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

// Spanish voices that are women's, by the names browsers give them.
const PREFERRED = /paulina|sabina|m[oó]nica|helena|laura|elvira|dalia|lupe|paloma|marisol|ximena|google español de estados unidos|google español/i

let voice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
  const rank = (v: SpeechSynthesisVoice) =>
    (v.lang === 'es-MX' ? 4 : v.lang === 'es-US' ? 3 : v.lang.startsWith('es-419') ? 2 : 0) + (PREFERRED.test(v.name) ? 5 : 0) + (v.localService ? 1 : 0)
  return all.sort((a, b) => rank(b) - rank(a))[0] ?? null
}

if (canSpeak()) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = pickVoice()
  })
}

/** Says `text` out loud; `onDone` runs when it finishes (or right away if it can't talk). */
export function speak(text: string, onDone?: () => void) {
  if (!canSpeak()) {
    onDone?.()
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  if (voice === undefined) voice = pickVoice()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang ?? 'es-MX'
  if (voice) u.voice = voice
  u.rate = 1.05
  let done = false
  const finish = () => {
    if (done) return
    done = true
    window.clearTimeout(guard)
    onDone?.()
  }
  // Some browsers never fire "end": don't stay waiting forever.
  const guard = window.setTimeout(finish, 1500 + text.length * 90)
  u.onend = finish
  u.onerror = finish
  synth.speak(u)
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
