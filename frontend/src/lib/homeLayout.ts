import type { HomeCardId, HomeCardSetting } from '../api/auth'
import { t } from './i18n'

export const HOME_CARDS: { id: HomeCardId; label: string }[] = [
  { id: 'today', get label() { return t('Para hoy') } },
  { id: 'tracker', get label() { return t('Registro de tiempo') } },
  { id: 'activity', get label() { return t('Actividad') } },
  { id: 'goals', get label() { return t('Metas') } },
  { id: 'upcoming', get label() { return t('Próximos 7 días') } },
  { id: 'projects', get label() { return t('Proyectos') } },
  { id: 'team', get label() { return t('Carga del equipo') } },
  { id: 'quick', get label() { return t('Captura rápida') } },
  { id: 'priority', get label() { return t('Prioridad alta') } },
  { id: 'rhythm', get label() { return t('Ritmo') } },
  { id: 'time', get label() { return t('Tiempo por proyecto') } },
  { id: 'stale', get label() { return t('Sin movimiento') } },
  { id: 'comments', get label() { return t('Comentarios recientes') } },
  { id: 'notes', get label() { return t('Notas rápidas') } },
  { id: 'agenda', get label() { return t('Agenda de la semana') } },
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
