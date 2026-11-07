import type { CSSProperties } from 'react'
import type { Priority, ProjectColor } from '../api/types'
import { t } from './i18n'

export const PROJECT_COLORS: { value: ProjectColor; label: string }[] = [
  { value: 'orange', get label() { return t('Naranja') } },
  { value: 'blue', get label() { return t('Azul') } },
  { value: 'teal', get label() { return t('Verde azulado') } },
  { value: 'violet', get label() { return t('Violeta') } },
  { value: 'pink', get label() { return t('Rosa') } },
  { value: 'green', get label() { return t('Verde') } },
  { value: 'amber', get label() { return t('Ámbar') } },
  { value: 'slate', get label() { return t('Gris') } },
]

/** Soft chip colors for a project/status color, from tokens.css (both themes). */
export function chipStyle(color: ProjectColor): CSSProperties {
  return { background: `var(--c-${color}-bg)`, color: `var(--c-${color}-fg)` }
}

export function dotColor(color: ProjectColor): string {
  return `var(--c-${color}-dot)`
}

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 1, get label() { return t('Alta') }, color: '#DC2626' },
  { value: 2, get label() { return t('Media') }, color: '#D97706' },
  { value: 3, get label() { return t('Baja') }, color: '#16A34A' },
]

export function priorityInfo(priority: Priority) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1]
}
