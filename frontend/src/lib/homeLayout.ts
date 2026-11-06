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

/** Puts a dragged card where another one was (the rest shift over). */
export function moveCard(layout: HomeCardSetting[], id: HomeCardId, overId: HomeCardId): HomeCardSetting[] {
  const from = layout.findIndex((c) => c.id === id)
  const to = layout.findIndex((c) => c.id === overId)
  if (from < 0 || to < 0 || from === to) return layout
  const next = [...layout]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

export function toggleCard(layout: HomeCardSetting[], id: HomeCardId): HomeCardSetting[] {
  return layout.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c))
}
