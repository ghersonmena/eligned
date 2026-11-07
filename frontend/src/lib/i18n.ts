/**
 * Translations. Spanish is the original text and doubles as the key:
 *
 *   t('Ver todas mis tareas')            → "See all my tasks" in English
 *   t('Hola, {name}', { name: 'Ana' })   → placeholders in {braces}
 *
 * English lives in src/locales/en/*.json (Spanish → English). A test checks
 * that every t('…') / tk('…') text has its English version.
 *
 * Plurals are chosen where the text is written (n === 1 ? '…' : '…'), so each
 * form is its own key. Constants at module level use tk('…') (marks the text,
 * doesn't translate) and are translated where shown: t(item.label).
 *
 * Changing the language remounts the app (see App.tsx), so plain t() calls
 * anywhere always read the current one.
 */
import { createElement, Fragment, type ReactNode } from 'react'
import { create } from 'zustand'
import english from '../locales/en'

export type Locale = 'es' | 'en'

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

export const EN: Record<string, string> = { ...english }

const STORAGE_KEY = 'idioma'

function initial(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'es' || saved === 'en') return saved
  } catch {
    // Storage blocked: use the browser's language.
  }
  if (typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language)) return 'en'
  return 'es'
}

let current: Locale = initial()
if (typeof document !== 'undefined') document.documentElement.lang = current

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: current,
  setLocale: (locale) => {
    if (locale === current) return
    current = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Only remembers it for the next visit.
    }
    document.documentElement.lang = locale
    set({ locale })
  },
}))

export function getLocale(): Locale {
  return current
}

/** Marks a text for translation without translating it (module-level constants). */
export const tk = <T extends string>(text: T): T => text

export function t(text: string, vars?: Record<string, string | number>): string {
  const out = current === 'es' ? text : (EN[text] ?? text)
  if (!vars) return out
  return out.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all))
}

/**
 * Like t(), but the {placeholders} can be elements, so a sentence with bold
 * parts or links is translated as a whole:
 *   tx('{who} te invitó a {space}', { who: <strong>Ana</strong>, space: <strong>Soporte</strong> })
 */
export function tx(text: string, vars: Record<string, ReactNode>): ReactNode {
  const out = current === 'es' ? text : (EN[text] ?? text)
  const parts = out.split(/\{(\w+)\}/)
  return parts.map((part, i) => createElement(Fragment, { key: i }, i % 2 === 1 ? (part in vars ? vars[part] : `{${part}}`) : part))
}

/** Locale for Intl (dates, numbers, relative times). */
export function intlLocale(): string {
  return current === 'en' ? 'en-US' : 'es'
}

const cache = new Map<string, Intl.DateTimeFormat>()

/** A date formatter in the current language (cached). */
export function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = current + JSON.stringify(options)
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(), options)
    cache.set(key, f)
  }
  return f
}

const rtfCache = new Map<string, Intl.RelativeTimeFormat>()
export function relativeFormat(): Intl.RelativeTimeFormat {
  let f = rtfCache.get(current)
  if (!f) {
    f = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' })
    rtfCache.set(current, f)
  }
  return f
}
