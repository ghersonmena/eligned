import { describe, expect, it } from 'vitest'
import { rankVoices, voiceLabel } from './speech'

const v = (name: string, lang: string) => ({ name, lang })

describe('voices', () => {
  it('puts natural voices first, then the closest to Mexico', () => {
    const ranked = rankVoices([
      v('Google español', 'es-ES'),
      v('Microsoft Sabina - Spanish (Mexico)', 'es-MX'),
      v('Microsoft Dalia Online (Natural) - Spanish (Mexico)', 'es-MX'),
      v('Samantha', 'en-US'),
      v('Microsoft Elvira Online (Natural) - Spanish (Spain)', 'es-ES'),
      v('Paulina', 'es-MX'),
    ])
    expect(ranked.map((x) => x.name)).toEqual([
      'Microsoft Dalia Online (Natural) - Spanish (Mexico)',
      'Microsoft Elvira Online (Natural) - Spanish (Spain)',
      'Microsoft Sabina - Spanish (Mexico)',
      'Paulina',
      'Google español',
    ])
  })

  it('gives short names', () => {
    expect(voiceLabel(v('Microsoft Dalia Online (Natural) - Spanish (Mexico)', 'es-MX'))).toBe('Dalia · México')
    expect(voiceLabel(v('Paulina (Mejorada)', 'es-MX'))).toBe('Paulina · México')
    expect(voiceLabel(v('Google español de Estados Unidos', 'es-US'))).toBe('español de Estados Unidos')
  })
})
