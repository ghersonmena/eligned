import { describe, expect, it } from 'vitest'
import { upper, upperFields } from './text'

describe('upper', () => {
  it('capitalizes Spanish text', () => {
    expect(upper('revisar año fiscal, ñandú')).toBe('REVISAR AÑO FISCAL, ÑANDÚ')
  })

  it('keeps links and emails as written', () => {
    expect(upper('ver https://ejemplo.com/Doc?id=aB y escribir a ana.P@correo.mx hoy')).toBe(
      'VER https://ejemplo.com/Doc?id=aB Y ESCRIBIR A ana.P@correo.mx HOY',
    )
  })

  it('leaves null alone and only touches the given fields', () => {
    expect(upper(null)).toBeNull()
    expect(upperFields({ title: 'a', description: null, color: 'orange' }, ['title', 'description'])).toEqual({
      title: 'A',
      description: null,
      color: 'orange',
    })
  })
})
