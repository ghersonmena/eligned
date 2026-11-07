import { afterEach, describe, expect, it } from 'vitest'
import { EN, t, useLocaleStore } from './i18n'

// The app's own source files, as text.
const SOURCES = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.*', '!../locales/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Every literal passed to t('…') or tk('…'), in '…', "…" or `…` without ${}. */
function usedTexts(): Map<string, string> {
  const found = new Map<string, string>()
  const re = /\b(?:t|tk|tx|tr)\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`([^`$]*)`)/g
  for (const [file, code] of Object.entries(SOURCES)) {
    if (file.endsWith('/i18n.ts')) continue // its comments show examples
    for (const m of code.matchAll(re)) {
      const raw = m[1] ?? m[2] ?? m[3]
      const text = raw.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n')
      found.set(text, file.replace('../', ''))
    }
  }
  return found
}

describe('translations', () => {
  afterEach(() => useLocaleStore.getState().setLocale('es'))

  it('has English for every text in the app', () => {
    const missing = [...usedTexts()].filter(([text]) => !(text in EN)).map(([text, file]) => `${file}: ${text}`)
    expect(missing).toEqual([])
  })

  it('keeps the same {placeholders} in English', () => {
    const wrong = Object.entries(EN).filter(([es, en]) => {
      const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
      return names(es) !== names(en)
    })
    expect(wrong).toEqual([])
  })

  it('has no English left over that nothing uses', () => {
    const used = usedTexts()
    expect(Object.keys(EN).filter((k) => !used.has(k))).toEqual([])
  })

  it('translates and fills in placeholders', () => {
    EN['Hola, {name}'] = 'Hi, {name}'
    expect(t('Hola, {name}', { name: 'Ana' })).toBe('Hola, Ana')
    useLocaleStore.getState().setLocale('en')
    expect(t('Hola, {name}', { name: 'Ana' })).toBe('Hi, Ana')
    expect(t('Texto sin traducción')).toBe('Texto sin traducción')
    delete EN['Hola, {name}']
  })
})
