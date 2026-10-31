import type { IconName } from './components/Icon'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Roadmap phase that delivers this section (see docs/ARQUITECTURA.md). */
  phase?: number
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/tareas', label: 'Mis tareas', icon: 'tasks' },
  { to: '/calendario', label: 'Calendario', icon: 'calendar', phase: 2 },
  { to: '/tablero', label: 'Tablero', icon: 'board', phase: 2 },
  { to: '/cronograma', label: 'Cronograma', icon: 'timeline', phase: 2 },
  { to: '/proyectos', label: 'Proyectos', icon: 'folder' },
  { to: '/metas', label: 'Metas', icon: 'goal', phase: 4 },
  { to: '/equipo', label: 'Equipo', icon: 'team', phase: 4 },
]

/** Bottom bar on phones: the most used sections. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  NAV_ITEMS[3],
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
]
