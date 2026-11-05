import { describe, expect, it } from 'vitest'
import type { HomeCardSetting } from '../api/auth'
import { DEFAULT_LAYOUT, moveCard, resolveLayout, toggleCard } from './homeLayout'

describe('home layout', () => {
  it('uses the default without a saved layout', () => {
    expect(resolveLayout(null)).toEqual(DEFAULT_LAYOUT)
  })

  it('keeps the saved order, drops unknown cards and adds new ones at the end', () => {
    const saved = [
      { id: 'goals', hidden: false },
      { id: 'old-card', hidden: false },
      { id: 'today', hidden: true },
    ] as unknown as HomeCardSetting[]
    const out = resolveLayout(saved)
    expect(out.slice(0, 2)).toEqual([
      { id: 'goals', hidden: false },
      { id: 'today', hidden: true },
    ])
    expect(out).toHaveLength(DEFAULT_LAYOUT.length)
  })

  it('moves and hides cards', () => {
    const moved = moveCard(DEFAULT_LAYOUT, 'tracker', -1)
    expect(moved.slice(0, 2).map((c) => c.id)).toEqual(['tracker', 'today'])
    expect(moveCard(DEFAULT_LAYOUT, 'today', -1)).toBe(DEFAULT_LAYOUT)
    expect(toggleCard(DEFAULT_LAYOUT, 'team').find((c) => c.id === 'team')?.hidden).toBe(true)
  })
})
