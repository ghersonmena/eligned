import type { IconName } from './components/Icon'

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
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/tareas', label: 'Mis tareas', icon: 'tasks' },
  { to: '/calendario', label: 'Calendario', icon: 'calendar' },
  { to: '/tablero', label: 'Tablero', icon: 'board' },
  { to: '/cronograma', label: 'Cronograma', icon: 'timeline' },
  { to: '/proyectos', label: 'Proyectos / Etiquetas', shortLabel: 'Proyectos', icon: 'folder' },
  { to: '/metas', label: 'Metas', icon: 'goal' },
  { to: '/equipo', label: 'Equipo', icon: 'team' },
]

/** Bottom bar on phones: the most used sections. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[5],
  NAV_ITEMS[2],
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
]

/** Tabs shared by the four ways of looking at tasks. */
export const VIEW_TABS = [
  { to: '/tareas', label: 'Lista' },
  { to: '/tablero', label: 'Tablero' },
  { to: '/calendario', label: 'Calendario' },
  { to: '/cronograma', label: 'Cronograma' },
] as const
