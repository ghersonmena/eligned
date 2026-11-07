import { addDays, dayKey, startOfDay } from './dates'

/** Days shown in the "Ritmo" card (two weeks). */
export const RHYTHM_DAYS = 14

export interface DayCount {
  day: Date
  count: number
}

/** Finished tasks per local day, oldest first, ending today. */
export function dailyCounts(completed: string[], days = RHYTHM_DAYS, now = new Date()): DayCount[] {
  const today = startOfDay(now)
  const counts = new Map<string, number>()
  for (const iso of completed) {
    const key = dayKey(new Date(iso))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1)
    return { day, count: counts.get(dayKey(day)) ?? 0 }
  })
}

/**
 * Days in a row with at least one finished task, up to today. Today without
 * anything yet doesn't break the streak (the day isn't over).
 */
export function streak(counts: DayCount[]): number {
  let i = counts.length - 1
  if (i >= 0 && counts[i].count === 0) i--
  let n = 0
  for (; i >= 0 && counts[i].count > 0; i--) n++
  return n
}
