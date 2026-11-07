import { describe, expect, it } from 'vitest'
import { dailyCounts, streak } from './insights'

const now = new Date(2026, 10, 5, 15, 0) // Thu 5 Nov, 15:00 local
const at = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString()

describe('dailyCounts', () => {
  it('groups by local day and ends today', () => {
    const counts = dailyCounts([at(5), at(5, 23), at(3), at(20)], 7, now)
    expect(counts).toHaveLength(7)
    expect(counts[6]).toMatchObject({ count: 2 })
    expect(counts[6].day.getDate()).toBe(5)
    expect(counts[4].count).toBe(1)
    expect(counts[0].day.getDate()).toBe(30) // 30 Oct
    expect(counts.reduce((s, c) => s + c.count, 0)).toBe(3)
  })
})

describe('streak', () => {
  it('counts days in a row up to today', () => {
    expect(streak(dailyCounts([at(5), at(4), at(3), at(1)], 7, now))).toBe(3)
  })

  it('keeps the streak while today has nothing yet', () => {
    expect(streak(dailyCounts([at(4), at(3)], 7, now))).toBe(2)
  })

  it('is zero after a day without anything', () => {
    expect(streak(dailyCounts([at(3)], 7, now))).toBe(0)
  })
})
