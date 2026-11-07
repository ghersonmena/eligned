import type { GoalHealth, KeyResult } from '../api/types'
import { dateFormat, intlLocale, t } from './i18n'

export const HEALTH: Record<GoalHealth, { label: string; color: string }> = {
  done: { get label() { return t('Lograda') }, color: '#16a34a' },
  on_track: { get label() { return t('A tiempo') }, color: '#0d9488' },
  at_risk: { get label() { return t('En riesgo') }, color: '#d97706' },
  late: { get label() { return t('Atrasada') }, color: '#dc2626' },
  no_dates: { get label() { return t('Sin fecha') }, color: '#a8958a' },
}

const num = { format: (n: number) => new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 2 }).format(n) }

/** "5 de 20 equipos" / "3 de 8 tareas". */
export function krValueText(kr: KeyResult): string {
  if (kr.kind === 'tasks') return t('{done} de {total} tareas', { done: kr.tasks?.done ?? 0, total: kr.tasks?.total ?? 0 })
  const unit = kr.unit ? ` ${kr.unit}` : ''
  return t('{current} de {target}', { current: num.format(kr.current_value), target: num.format(kr.target_value) }) + unit
}

/** "YYYY-MM-DD" → "31 dic 2026". */
export function formatGoalDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return dateFormat({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d))
}
