import { describe, expect, it } from 'vitest'
import { dueFrom, interpret, mergeDraft, parseAnswer, parseDraft, type Draft } from './parse'

// Friday 6 Nov 2026, 10:30 local
const NOW = new Date(2026, 10, 6, 10, 30)

const at = (text: string, now = NOW) => {
  const draft = parseDraft(text, now)
  const { due, allDay } = dueFrom(draft)
  return { title: draft.title, due: due && fmt(due), allDay }
}
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

describe('the two examples', () => {
  it('reminds me of today at 5 pm', () => {
    expect(at('Recuérdame que a las 5 de la tarde de hoy debo ir a la cita con mi esposa')).toEqual({
      title: 'ir a la cita con mi esposa',
      due: '2026-11-06 17:00',
      allDay: false,
    })
  })

  it('makes a reminder for Sunday at noon', () => {
    expect(at('Haz un recordatorio de revisión de los pull request de los desarrolladores para el domingo al medio día')).toEqual({
      title: 'revisión de los pull request de los desarrolladores',
      due: '2026-11-08 12:00',
      allDay: false,
    })
  })
})

describe('days', () => {
  it.each([
    ['llamar a soporte mañana', '2026-11-07 23:59', 'llamar a soporte'],
    ['pasado mañana pagar la luz', '2026-11-08 23:59', 'pagar la luz'],
    ['el lunes revisar el firewall', '2026-11-09 23:59', 'revisar el firewall'],
    ['el viernes junta de equipo', '2026-11-13 23:59', 'junta de equipo'],
    ['este viernes cerrar el reporte', '2026-11-06 23:59', 'cerrar el reporte'],
    ['el próximo miércoles inventario', '2026-11-11 23:59', 'inventario'],
    ['renovar dominio el 20 de noviembre', '2026-11-20 23:59', 'renovar dominio'],
    ['renovar licencia el 3 de enero', '2027-01-03 23:59', 'renovar licencia'],
    ['pagar hosting el 15', '2026-11-15 23:59', 'pagar hosting'],
    ['pagar hosting el 2', '2026-12-02 23:59', 'pagar hosting'],
    ['respaldo 24/12', '2026-12-24 23:59', 'respaldo'],
    ['auditoría la próxima semana', '2026-11-09 23:59', 'auditoría'],
    ['revisar cámaras en 3 días', '2026-11-09 23:59', 'revisar cámaras'],
  ])('%s', (text, due, title) => {
    expect(at(text)).toEqual({ title, due, allDay: true })
  })
})

describe('times', () => {
  it.each([
    ['junta a las 4', '2026-11-06 16:00'],
    ['junta a las 9', '2026-11-07 09:00'], // 9 a. m. already passed today
    ['junta mañana a las 9 de la mañana', '2026-11-07 09:00'],
    ['junta mañana a las 10 y media', '2026-11-07 10:30'],
    ['junta mañana a las 8 y cuarto', '2026-11-07 08:15'],
    ['junta mañana a las 9 menos cuarto', '2026-11-07 08:45'],
    ['junta mañana a las 17:30', '2026-11-07 17:30'],
    ['junta mañana 5:30 p.m.', '2026-11-07 17:30'],
    ['junta mañana a las 11 de la noche', '2026-11-07 23:00'],
    ['junta mañana a las cinco de la tarde', '2026-11-07 17:00'],
    ['junta mañana 18 hrs', '2026-11-07 18:00'],
    ['junta el lunes por la mañana', '2026-11-09 09:00'],
    ['cenar esta noche', '2026-11-06 20:00'],
    ['llamar a mamá en 2 horas', '2026-11-06 12:30'],
    ['sacar la ropa en 30 minutos', '2026-11-06 11:00'],
    ['revisar el horno en media hora', '2026-11-06 11:00'],
    ['junta el domingo 8 de noviembre a las 12 p.m.', '2026-11-08 12:00'],
  ])('%s', (text, due) => {
    expect(at(text)).toMatchObject({ title: expect.stringMatching(/^(junta|cenar|llamar a mamá|sacar la ropa|revisar el horno)$/), due, allDay: false })
  })

  it('keeps the morning out of "tomorrow"', () => {
    expect(at('llamar en la mañana')).toMatchObject({ due: '2026-11-07 09:00', title: 'llamar' })
  })
})

describe('titles', () => {
  it.each([
    ['Recuérdame comprar tóner', 'comprar tóner'],
    ['agrega una tarea de actualizar el antivirus', 'actualizar el antivirus'],
    ['crea un pendiente para llamar al proveedor', 'llamar al proveedor'],
    ['anota que tengo que pagar el internet', 'pagar el internet'],
    ['tengo que revisar el NAS', 'revisar el NAS'],
    ['recuérdame', ''],
  ])('%s', (text, title) => {
    expect(parseDraft(text, NOW).title).toBe(title)
  })

  it('has no date when none is said', () => {
    expect(at('comprar cable de red')).toEqual({ title: 'comprar cable de red', due: null, allDay: false })
  })
})

describe('interpret', () => {
  it.each([
    ['¿Qué tengo hoy?', 'today'],
    ['qué tengo para mañana', 'tomorrow'],
    ['¿Qué vence esta semana?', 'week'],
    ['qué tareas tengo atrasadas', 'overdue'],
    ['mis pendientes de hoy', 'today'],
    ['cuántas tareas tengo', 'today'],
  ])('asks: %s', (text, range) => {
    expect(interpret(text, NOW)).toEqual({ kind: 'query', range })
  })

  it('creates otherwise, and gives up on nothing', () => {
    expect(interpret('recuérdame pagar la luz mañana', NOW).kind).toBe('create')
    expect(interpret('   ', NOW).kind).toBe('unknown')
  })
})

describe('answers and corrections', () => {
  it.each(['sí', 'Sí, está bien', 'correcto', 'claro', 'dale', 'ok'])('yes: %s', (t) => {
    expect(parseAnswer(t).kind).toBe('yes')
  })

  it('reads a no with a correction', () => {
    expect(parseAnswer('No, a las 6')).toEqual({ kind: 'no', rest: 'a las 6' })
    expect(parseAnswer('cancela')).toEqual({ kind: 'no', rest: '' })
    expect(parseAnswer('quién sabe').kind).toBe('other')
  })

  it('moves only the time, or only the day', () => {
    const base: Draft = parseDraft('ir a la cita con mi esposa hoy a las 5 de la tarde', NOW)
    expect(fmt(dueFrom(mergeDraft(base, parseDraft('a las 6', NOW))).due!)).toBe('2026-11-06 18:00')
    expect(fmt(dueFrom(mergeDraft(base, parseDraft('el lunes', NOW))).due!)).toBe('2026-11-09 17:00')
    expect(mergeDraft(base, parseDraft('a las 6', NOW)).title).toBe('ir a la cita con mi esposa')
  })
})
