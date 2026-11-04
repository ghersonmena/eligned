import type { CSSProperties } from 'react'
import type { Priority, ProjectColor } from '../api/types'

export const PROJECT_COLORS: { value: ProjectColor; label: string }[] = [
  { value: 'orange', label: 'Naranja' },
  { value: 'blue', label: 'Azul' },
  { value: 'teal', label: 'Verde azulado' },
  { value: 'violet', label: 'Violeta' },
  { value: 'pink', label: 'Rosa' },
  { value: 'green', label: 'Verde' },
  { value: 'amber', label: 'Ámbar' },
  { value: 'slate', label: 'Gris' },
]

/** Soft chip colors for a project/status color, from tokens.css (both themes). */
export function chipStyle(color: ProjectColor): CSSProperties {
  return { background: `var(--c-${color}-bg)`, color: `var(--c-${color}-fg)` }
}

export function dotColor(color: ProjectColor): string {
  return `var(--c-${color}-dot)`
}

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 1, label: 'Alta', color: '#DC2626' },
  { value: 2, label: 'Media', color: '#D97706' },
  { value: 3, label: 'Baja', color: '#16A34A' },
]

export function priorityInfo(priority: Priority) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1]
}
