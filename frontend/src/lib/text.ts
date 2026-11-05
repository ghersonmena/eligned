/**
 * Everything people write (titles, descriptions, comments, project names) is
 * kept in capitals. Inputs show it with CSS while typing (changing the value
 * on each keystroke breaks phone keyboards), and this turns it into real
 * capitals before it is saved (links and emails excepted).
 */
export function upper(text: string): string
export function upper(text: string | null): string | null
export function upper(text: string | null | undefined): string | null | undefined
export function upper(text: string | null | undefined) {
  if (typeof text !== 'string') return text
  // Links and emails are case-sensitive: they are kept as written.
  return text
    .split(KEEP_AS_IS)
    .map((part, i) => (i % 2 === 1 ? part : part.toLocaleUpperCase('es')))
    .join('')
}

const KEEP_AS_IS = /((?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+\.[\w.]+)/i

/** Same object with its free-text fields in capitals (only the ones present). */
export function upperFields<T extends object>(input: T, fields: readonly (keyof T)[]): T {
  const out = { ...input }
  fields.forEach((f) => {
    const v = out[f]
    if (typeof v === 'string') out[f] = upper(v) as T[keyof T]
  })
  return out
}
