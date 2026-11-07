import { describe, expect, it } from 'vitest'
import { sayDay, sayTime, sayWhen } from './describe'
import { parseDraft } from './parse'

const NOW = new Date(2026, 10, 6, 10, 30) // Friday

describe('sayWhen', () => {
  it.each([
    ['hoy a las 5 de la tarde', 'hoy a las 5 de la tarde'],
    ['el domingo al medio día', 'el domingo 8 de noviembre a las 12 del día'],
    ['mañana a las 9 y media', 'mañana a las 9 y media de la mañana'],
    ['mañana', 'mañana, sin hora'],
    ['el 3 de enero', 'el 3 de enero de 2027, sin hora'],
    ['a las 1:15 pm', 'hoy a la 1 y cuarto de la tarde'],
    ['a las 9 de la noche', 'hoy a las 9 de la noche'],
    ['algo', 'sin fecha'],
  ])('%s', (text, said) => {
    expect(sayWhen(parseDraft(text, NOW), NOW)).toBe(said)
  })

  it('names days near and far', () => {
    expect(sayDay(new Date(2026, 10, 25), NOW)).toBe('el 25 de noviembre')
    expect(sayTime(0, 0)).toBe('a las 12 de la noche')
  })
})
