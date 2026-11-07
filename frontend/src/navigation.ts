import type { IconName } from './components/Icon'
import { tk } from './lib/i18n'

export interface NavItem {
  to: string
  label: string
  /** Shorter label for the phone bottom bar. */
  shortLabel?: string
  icon: IconName
  /** Roadmap phase that delivers this section (see docs/ARQUITECTURA.md). */
  phase?: number
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: tk('Inicio'), icon: 'home' },
  { to: '/tareas', label: tk('Mis tareas'), icon: 'tasks' },
  { to: '/calendario', label: tk('Calendario'), icon: 'calendar' },
  { to: '/tablero', label: tk('Tablero'), icon: 'board' },
  { to: '/cronograma', label: tk('Cronograma'), icon: 'timeline' },
  { to: '/proyectos', label: tk('Proyectos / Etiquetas'), shortLabel: tk('Proyectos'), icon: 'folder' },
  { to: '/metas', label: tk('Metas'), icon: 'goal' },
  { to: '/equipo', label: tk('Equipo'), icon: 'team' },
]

/** Bottom bar on phones: the most used sections. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[5],
  NAV_ITEMS[2],
  { to: '/ajustes', label: tk('Ajustes'), icon: 'settings' },
]

/** Tabs shared by the four ways of looking at tasks. */
export const VIEW_TABS = [
  { to: '/tareas', label: tk('Lista') },
  { to: '/tablero', label: tk('Tablero') },
  { to: '/calendario', label: tk('Calendario') },
  { to: '/cronograma', label: tk('Cronograma') },
] as const
