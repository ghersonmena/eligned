/**
 * Understands what you tell the assistant, in Spanish, with plain rules (no AI).
 *
 * "Recuérdame que a las 5 de la tarde de hoy debo ir a la cita con mi esposa"
 *   → create { title: "ir a la cita con mi esposa", day: today, time: 17:00 }
 * "¿Qué tengo mañana?" → query { range: "tomorrow" }
 *
 * Works on a lower-case copy without accents (same length as the original, so
 * the positions found there cut the original text and the title keeps its accents).
 * When it can't make sense of a phrase it says so (`unknown`), so an AI can take
 * over later without changing the rest of the assistant.
 */

export interface Clock {
  h: number
  m: number
}

export interface Draft {
  title: string
  /** Local day (00:00), or null. */
  day: Date | null
  time: Clock | null
  /** "en 2 horas": an exact moment instead of day + time. */
  exact: Date | null
}

export type QueryRange = 'today' | 'tomorrow' | 'week' | 'overdue'

export type Intent = { kind: 'create'; draft: Draft } | { kind: 'query'; range: QueryRange } | { kind: 'unknown' }

/* ---------- Text helpers ---------- */

/** Lower case without accents, keeping one character per character. */
export function fold(text: string): string {
  return Array.from(text, (c) => c.toLowerCase().normalize('NFD')[0]).join('')
}

const NUMBERS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veinticinco: 25,
  treinta: 30,
  cuarenta: 40,
  cuarentaicinco: 45,
  cincuenta: 50,
}
const NUM = `(\\d{1,2}|${Object.keys(NUMBERS).join('|')})`
const toNumber = (s: string) => (/^\d+$/.test(s) ? Number(s) : (NUMBERS[s] ?? NaN))

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

/** Little words that go with a date ("para el", "de", "a las") and leave with it. */
const B = '(?<![\\p{L}\\d])' // word start
const LEAD = `${B}(?:(?:para|el|este|esta|de|del|a|al|en|y|,)\\s+)*`
const E = '(?![\\p{L}\\d])' // word end

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/* ---------- Intent ---------- */

export function interpret(text: string, now = new Date()): Intent {
  const clean = text.trim().replace(/[.!¡¿?]+$/u, '')
  if (!clean) return { kind: 'unknown' }
  const query = parseQuery(fold(clean))
  if (query) return { kind: 'query', range: query }
  const draft = parseDraft(clean, now)
  if (!draft.title && !draft.day && !draft.time && !draft.exact) return { kind: 'unknown' }
  return { kind: 'create', draft }
}

function parseQuery(n: string): QueryRange | null {
  const s = n.replace(/^[¿\s]+/u, '')
  const asks =
    /^(que|cuales|cuantas|cuantos|dime|muestrame|ensename|lee(me)?|revisa)\b/.test(s) && /\b(tengo|hay|vence|vencen|pendientes?|tareas?|toca)\b/.test(s)
  const listing = /^(mis )?(tareas|pendientes)( de| para)?\b/.test(s)
  if (!asks && !listing) return null
  if (/\b(atrasad|vencid|retrasad)/.test(s)) return 'overdue'
  if (/\bpasado manana\b/.test(s)) return null
  if (/\bmanana\b/.test(s)) return 'tomorrow'
  if (/\bsemana\b/.test(s)) return 'week'
  return 'today'
}

/* ---------- Create: date, time and title ---------- */

interface Found {
  start: number
  end: number
}

export function parseDraft(text: string, now = new Date()): Draft {
  const n = fold(text)
  const cut: Found[] = []
  const today = startOfDay(now)
  let day: Date | null = null
  let time: Clock | null = null
  let exact: Date | null = null

  const take = (re: RegExp, fn: (m: RegExpExecArray) => boolean | void) => {
    const g = new RegExp(re.source, 'gu')
    let m: RegExpExecArray | null
    while ((m = g.exec(n))) {
      const start = m.index
      const end = start + m[0].length
      if (cut.some((c) => start < c.end && end > c.start)) continue
      if (fn(m) !== false) cut.push({ start, end })
    }
  }

  // "en 2 horas", "en media hora", "dentro de 3 días"
  take(new RegExp(`${B}(?:en|dentro de)\\s+(${NUM.slice(1, -1)}|media)\\s+(minutos?|min|horas?|dias?|semanas?)(\\s+y\\s+media)?${E}`), (m) => {
    const amount = m[1] === 'media' ? 0.5 : toNumber(m[1])
    if (Number.isNaN(amount)) return false
    const unit = m[2]
    const extra = m[3] ? 0.5 : 0
    if (unit.startsWith('min')) exact = new Date(now.getTime() + amount * 60_000)
    else if (unit.startsWith('hora')) exact = new Date(now.getTime() + (amount + extra) * 3_600_000)
    else {
      day = addDays(today, unit.startsWith('dia') ? amount : amount * 7)
      return
    }
  })

  // Time of day, before "mañana" so "de la mañana" isn't read as tomorrow.
  const MER = '(?:\\s*(de la manana|de la tarde|de la noche|de la madrugada|del dia|a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|hrs\\.?|horas|h))?'
  take(new RegExp(`${LEAD}${B}(?:a las|a la|alas|las)\\s+${NUM}(?:(?::|\\.)(\\d{2})|\\s+y\\s+(media|cuarto|${NUM.slice(1, -1)})|\\s+menos\\s+(cuarto|${NUM.slice(1, -1)}))?${MER}${E}`), (m) =>
    setTime(m[1], m[2], m[3], m[4], m[5]),
  )
  take(new RegExp(`${LEAD}${B}(\\d{1,2})(?::(\\d{2}))${MER}${E}`), (m) => setTime(m[1], m[2], undefined, undefined, m[3]))
  take(new RegExp(`${LEAD}${B}(\\d{1,2})\\s*(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|hrs\\.?)(?![\\p{L}\\d])`), (m) => setTime(m[1], undefined, undefined, undefined, m[2]))
  take(new RegExp(`${LEAD}${B}(?:al|a|el)?\\s*medio\\s?dia${E}`), () => {
    if (time) return false
    time = { h: 12, m: 0 }
  })
  take(new RegExp(`${LEAD}${B}(?:a la )?medianoche${E}`), () => {
    if (time) return false
    time = { h: 23, m: 59 }
  })

  function setTime(hs: string, mm?: string, plus?: string, minus?: string, mer?: string): boolean {
    if (time) return false
    let h = toNumber(hs)
    let m = mm ? Number(mm) : 0
    if (plus) m = plus === 'media' ? 30 : plus === 'cuarto' ? 15 : toNumber(plus)
    if (minus) {
      m = 60 - (minus === 'cuarto' ? 15 : toNumber(minus))
      h -= 1
    }
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return false
    const tag = (mer ?? '').replace(/[\s.]/g, '')
    if (/^(pm|delatarde|delanoche)$/.test(tag) && h < 12) h += 12
    else if (/^(am|delamanana|delamadrugada)$/.test(tag) && h === 12) h = 0
    else if (tag === 'delanoche' && h === 12) h = 23
    else if (!tag && h >= 1 && h <= 6) h += 12 // "a las 5" → 17:00
    time = { h: (h + 24) % 24, m }
    return true
  }

  // Days
  take(new RegExp(`${LEAD}${B}pasado manana${E}`), () => {
    day = addDays(today, 2)
  })
  take(new RegExp(`${LEAD}${B}manana${E}`), (m) => {
    // "de la mañana", "por la mañana" is the morning, not tomorrow.
    if (/(?:de|en|por) la\s+$/.test(n.slice(0, m.index + m[0].length - 'manana'.length))) return false
    if (day) return false
    day = addDays(today, 1)
  })
  take(new RegExp(`${LEAD}${B}(?:hoy|esta (noche|tarde|manana))${E}`), (m) => {
    if (day) return false
    day = today
    if (m[1] === 'noche' && !time) time = { h: 20, m: 0 }
    if (m[1] === 'tarde' && !time) time = { h: 16, m: 0 }
    if (m[1] === 'manana' && !time) time = { h: 9, m: 0 }
  })
  take(new RegExp(`${LEAD}${B}(?:(proximo|proxima|siguiente)\\s+)?(${WEEKDAYS.join('|')})(\\s+(?:que viene|proximo|siguiente))?(?:\\s+(\\d{1,2})(?:\\s+de\\s+(${MONTHS.join('|')}))?)?${E}`), (m) => {
    if (day) return false
    const dow = WEEKDAYS.indexOf(m[2])
    let diff = (dow - today.getDay() + 7) % 7
    const isThis = /\b(este|esta)\s+$/.test(m[0].slice(0, m[0].indexOf(m[2])))
    if (diff === 0 && !isThis) diff = 7
    day = addDays(today, diff)
    // "el domingo 8 de noviembre": the explicit date wins.
    if (m[4]) {
      const explicit = dateFrom(Number(m[4]), m[5] ? MONTHS.indexOf(m[5]) : null, null)
      if (explicit) day = explicit
    }
  })
  take(new RegExp(`${LEAD}${B}(?:la\\s+)?(?:proxima semana|semana que viene|siguiente semana)${E}`), () => {
    if (day) return false
    day = addDays(today, ((8 - today.getDay()) % 7) || 7) // next Monday
  })
  take(new RegExp(`${LEAD}${B}(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${MONTHS.join('|')})(?:\\s+(?:de|del)\\s+(\\d{4}))?${E}`), (m) => {
    if (day) return false
    const d = dateFrom(Number(m[1]), MONTHS.indexOf(m[2]), m[3] ? Number(m[3]) : null)
    if (!d) return false
    day = d
  })
  take(new RegExp(`${LEAD}${B}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?${E}`), (m) => {
    if (day) return false
    const y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : null
    const d = dateFrom(Number(m[1]), Number(m[2]) - 1, y)
    if (!d) return false
    day = d
  })
  take(new RegExp(`${LEAD}${B}el\\s+(?:dia\\s+)?(\\d{1,2})${E}(?!\\s*(?::|de\\s|/))`), (m) => {
    if (day) return false
    const d = dateFrom(Number(m[1]), null, null)
    if (!d) return false
    day = d
  })
  // Part of the day without a clock time.
  take(new RegExp(`${LEAD}${B}(?:en|por) la (manana|tarde|noche)${E}`), (m) => {
    if (time) return true // already said "a las 5 …": just drop the words
    time = m[1] === 'manana' ? { h: 9, m: 0 } : m[1] === 'tarde' ? { h: 16, m: 0 } : { h: 20, m: 0 }
  })

  function dateFrom(d: number, month: number | null, year: number | null): Date | null {
    if (d < 1 || d > 31) return null
    let y = year ?? today.getFullYear()
    let mo = month ?? today.getMonth()
    let date = new Date(y, mo, d)
    if (date.getMonth() !== ((mo % 12) + 12) % 12) return null // 31 de febrero
    if (year === null && date < today) {
      // Already gone: the next one.
      if (month === null) mo += 1
      else y += 1
      date = new Date(y, mo, d)
    }
    return date
  }

  // A time said without a day: today, or tomorrow if that time already passed.
  if (time && !day && !exact) {
    const t = time as Clock
    const at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), t.h, t.m)
    day = at.getTime() <= now.getTime() ? addDays(today, 1) : today
  }

  return { title: titleFrom(text, n, cut), day, time, exact }
}

/* ---------- Title: what's left once the date is gone ---------- */

const TRIGGERS = [
  'por favor',
  'oye',
  'asistente',
  'lil+[iy]+e?', // Lily, as speech recognition may spell it
  'recuerdame',
  'recordarme',
  'recuerda',
  'avisame',
  'haz(?:me)?',
  'crea(?:r|me)?',
  'agrega(?:r|me)?',
  'anade',
  'anota(?:me)?',
  'apunta(?:me)?',
  'pon(?:me|le)?',
  'programa(?:me)?',
  'guarda(?:me)?',
  'quiero',
  'necesito',
  'debo',
  'tengo que',
  'hay que',
  'tendre que',
]
const NOUNS = 'recordatorio|tarea|nota|pendiente|alarma|aviso|evento'
const LEADING = new RegExp(
  `^[\\s,]*(?:que|un|una|el|la|de|del|para|a|y|me|se|(?:${TRIGGERS.join('|')})|(?:un |una )?(?:${NOUNS}))(?![\\p{L}\\d])[\\s,]*`,
  'u',
)
const TRAILING = /(?<![\p{L}\d])(?:para|el|la|de|del|a|al|que|y|en|por|con)\s*$|[\s,;:]+$/u

function titleFrom(text: string, n: string, cut: Found[]): string {
  let keep = ''
  let keepN = ''
  for (let i = 0; i < text.length; i++) {
    if (cut.some((c) => i >= c.start && i < c.end)) {
      if (!keep.endsWith(' ')) {
        keep += ' '
        keepN += ' '
      }
      continue
    }
    keep += text[i]
    keepN += n[i]
  }
  // Drop "recuérdame que", "haz un recordatorio de", "debo"… from the start.
  for (;;) {
    const m = LEADING.exec(keepN)
    if (!m || m[0].length === 0) break
    keep = keep.slice(m[0].length)
    keepN = keepN.slice(m[0].length)
  }
  for (;;) {
    const m = TRAILING.exec(keepN)
    if (!m) break
    keep = keep.slice(0, m.index)
    keepN = keepN.slice(0, m.index)
  }
  return keep.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim()
}

/* ---------- When it is due ---------- */

/** The due date the task gets (day-only tasks: 23:59, like the rest of the app). */
export function dueFrom(draft: Draft): { due: Date | null; allDay: boolean } {
  if (draft.exact) return { due: draft.exact, allDay: false }
  if (!draft.day) return { due: null, allDay: false }
  const d = draft.day
  if (!draft.time) return { due: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59), allDay: true }
  return { due: new Date(d.getFullYear(), d.getMonth(), d.getDate(), draft.time.h, draft.time.m), allDay: false }
}

/** Applies a correction ("no, a las 6") on top of what was understood. */
export function mergeDraft(base: Draft, fix: Draft): Draft {
  if (fix.exact) return { ...base, exact: fix.exact, day: null, time: null, title: fix.title || base.title }
  return {
    title: fix.title || base.title,
    exact: fix.day || fix.time ? null : base.exact,
    day: fix.day ?? base.day ?? (fix.time && base.exact ? startOfDay(base.exact) : null),
    time: fix.time ?? base.time,
  }
}

/* ---------- Yes / no ---------- */

export type Answer = { kind: 'yes' } | { kind: 'no'; rest: string } | { kind: 'other' }

const YES = /^(si|sip|claro|correcto|exacto|eso|asi es|esta bien|ok|okay|okey|va|dale|perfecto|afirmativo|de acuerdo|guardala|guardalo|hazlo|adelante|confirmo|confirmado|listo)(?![\p{L}\d])/u
const NO = /^(no|nop|nel|cancela|cancelar|cancelalo|olvidalo|olvidala|mejor no|incorrecto|negativo|espera)(?![\p{L}\d])/u

export function parseAnswer(text: string): Answer {
  const n = fold(text.trim()).replace(/^[¡¿\s]+/u, '')
  const no = NO.exec(n)
  if (no) return { kind: 'no', rest: text.trim().replace(/^[¡¿\s]+/u, '').slice(no[0].length).replace(/^[\s,.;:]+/, '') }
  if (YES.test(n)) return { kind: 'yes' }
  return { kind: 'other' }
}
