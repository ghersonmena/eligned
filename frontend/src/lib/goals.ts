import type { GoalHealth, KeyResult } from '../api/types'

export const HEALTH: Record<GoalHealth, { label: string; color: string }> = {
  done: { label: 'Lograda', color: '#16a34a' },
  on_track: { label: 'A tiempo', color: '#0d9488' },
  at_risk: { label: 'En riesgo', color: '#d97706' },
  late: { label: 'Atrasada', color: '#dc2626' },
  no_dates: { label: 'Sin fecha', color: '#a8958a' },
}

const num = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

/** "5 de 20 equipos" / "3 de 8 tareas". */
export function krValueText(kr: KeyResult): string {
  if (kr.kind === 'tasks') return `${kr.tasks?.done ?? 0} de ${kr.tasks?.total ?? 0} tareas`
  const unit = kr.unit ? ` ${kr.unit}` : ''
  return `${num.format(kr.current_value)} de ${num.format(kr.target_value)}${unit}`
}

/** "YYYY-MM-DD" → "31 dic 2026". */
export function formatGoalDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d))
}
