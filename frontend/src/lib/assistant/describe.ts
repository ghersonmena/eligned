import type { Draft } from './parse'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const dayDiff = (a: Date, b: Date) =>
  Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() - new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) / 86_400_000)

/** "a las 5 de la tarde", "a la 1 y media de la tarde", "a las 12 del día". */
export function sayTime(h: number, m: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12
  const part = h === 0 ? 'de la noche' : h < 12 ? 'de la mañana' : h === 12 ? 'del día' : h < 20 ? 'de la tarde' : 'de la noche'
  const mins = m === 0 ? '' : m === 30 ? ' y media' : m === 15 ? ' y cuarto' : ` y ${m}`
  return `${h12 === 1 ? 'a la' : 'a las'} ${h12}${mins} ${part}`
}

/** "hoy", "mañana", "el domingo 8 de noviembre", "el 3 de enero de 2027". */
export function sayDay(day: Date, now = new Date()): string {
  const diff = dayDiff(now, day)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  const date = `${day.getDate()} de ${MONTHS[day.getMonth()]}${day.getFullYear() !== now.getFullYear() ? ` de ${day.getFullYear()}` : ''}`
  return diff > 0 && diff < 7 ? `el ${WEEKDAYS[day.getDay()]} ${date}` : `el ${date}`
}

/** When a draft is due, said the way a person would say it. */
export function sayWhen(draft: Draft, now = new Date()): string {
  const at = draft.exact ?? (draft.day && draft.time ? new Date(draft.day.getFullYear(), draft.day.getMonth(), draft.day.getDate(), draft.time.h, draft.time.m) : null)
  if (at) return `${sayDay(at, now)} ${sayTime(at.getHours(), at.getMinutes())}`
  if (draft.day) return `${sayDay(draft.day, now)}, sin hora`
  return 'sin fecha'
}

/** "17:00" for the panel. */
export function clock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
