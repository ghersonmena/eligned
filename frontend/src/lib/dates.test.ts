import { describe, expect, it } from 'vitest'
import { dueGroup, formatDue, fromInputs, toDateInput, toTimeInput } from './dates'

const now = new Date(2026, 9, 30, 9, 0) // viernes 30 oct 2026, 9:00
const local = (d: number, h = 23, m = 59, month = 9) => new Date(2026, month, d, h, m).toISOString()

describe('dueGroup', () => {
  it('groups by day relative to now', () => {
    expect(dueGroup(null, now)).toBe('none')
    expect(dueGroup(local(29), now)).toBe('overdue')
    expect(dueGroup(local(30, 8, 0), now)).toBe('overdue')
    expect(dueGroup(local(30), now)).toBe('today')
    expect(dueGroup(local(31, 10, 0), now)).toBe('tomorrow')
    expect(dueGroup(local(5, 23, 59, 10), now)).toBe('week')
    expect(dueGroup(local(20, 23, 59, 10), now)).toBe('later')
  })
})

describe('formatDue', () => {
  it('uses friendly words and hides the time of day-only dates', () => {
    expect(formatDue(local(30), now)).toBe('Hoy')
    expect(formatDue(local(31, 10, 0), now)).toMatch(/^Mañana 10:00$/)
    expect(formatDue(local(29), now)).toBe('Ayer')
  })
})

describe('date inputs', () => {
  it('round-trips a day-only date', () => {
    const iso = fromInputs('2026-11-02')!
    expect(toDateInput(iso)).toBe('2026-11-02')
    expect(toTimeInput(iso)).toBe('')
  })

  it('round-trips a date with time', () => {
    const iso = fromInputs('2026-11-02', '14:30')!
    expect(toDateInput(iso)).toBe('2026-11-02')
    expect(toTimeInput(iso)).toBe('14:30')
  })
})
