import type { HomeCardId, HomeCardSetting } from '../api/auth'

export const HOME_CARDS: { id: HomeCardId; label: string }[] = [
  { id: 'today', label: 'Para hoy' },
  { id: 'tracker', label: 'Registro de tiempo' },
  { id: 'activity', label: 'Actividad' },
  { id: 'goals', label: 'Metas' },
  { id: 'upcoming', label: 'Próximos 7 días' },
  { id: 'projects', label: 'Proyectos' },
  { id: 'team', label: 'Carga del equipo' },
  { id: 'quick', label: 'Captura rápida' },
  { id: 'priority', label: 'Prioridad alta' },
  { id: 'rhythm', label: 'Ritmo' },
  { id: 'time', label: 'Tiempo por proyecto' },
  { id: 'stale', label: 'Sin movimiento' },
  { id: 'comments', label: 'Comentarios recientes' },
  { id: 'notes', label: 'Notas rápidas' },
  { id: 'agenda', label: 'Agenda de la semana' },
]

export const DEFAULT_LAYOUT: HomeCardSetting[] = HOME_CARDS.map((c) => ({ id: c.id, hidden: false }))

/** Saved layout, without unknown cards and with any new ones added at the end. */
export function resolveLayout(saved: HomeCardSetting[] | null | undefined): HomeCardSetting[] {
  if (!saved) return DEFAULT_LAYOUT
  const known = new Set(HOME_CARDS.map((c) => c.id))
  const kept = saved.filter((c, i) => known.has(c.id) && saved.findIndex((o) => o.id === c.id) === i)
  const missing = DEFAULT_LAYOUT.filter((c) => !kept.some((k) => k.id === c.id))
  return [...kept, ...missing]
}

/** Moves a card one place up (-1) or down (+1). */
export function moveCard(layout: HomeCardSetting[], id: HomeCardId, direction: -1 | 1): HomeCardSetting[] {
  const i = layout.findIndex((c) => c.id === id)
  const j = i + direction
  if (i < 0 || j < 0 || j >= layout.length) return layout
  const next = [...layout]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function toggleCard(layout: HomeCardSetting[], id: HomeCardId): HomeCardSetting[] {
  return layout.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c))
}
