import { describe, expect, it } from 'vitest'
import { APP_VERSION, CHANGELOG, compareVersions, unseenReleases, type Release } from './changelog'

const list: Release[] = [
  { version: '1.2.0', date: '2026-12-01', changes: [] },
  { version: '1.0.10', date: '2026-11-20', changes: [] },
  { version: '1.0.1', date: '2026-11-12', changes: [] },
]

describe('compareVersions', () => {
  it('compares each part as a number', () => {
    expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0)
    expect(compareVersions('1.0.1', '1.0.1')).toBe(0)
    expect(compareVersions('1.0.1', '1.1.0')).toBeLessThan(0)
  })
})

describe('unseenReleases', () => {
  it('shows only what came after the last version seen', () => {
    expect(unseenReleases('1.0.1', null, list).map((r) => r.version)).toEqual(['1.2.0', '1.0.10'])
    expect(unseenReleases('1.2.0', null, list)).toEqual([])
  })

  it('never seen: only releases after the account was created', () => {
    expect(unseenReleases(null, '2026-11-04T01:31:12+00:00', list)).toHaveLength(3)
    expect(unseenReleases(null, '2026-11-15T10:00:00+00:00', list).map((r) => r.version)).toEqual(['1.2.0', '1.0.10'])
    expect(unseenReleases(null, '2026-12-02T10:00:00+00:00', list)).toEqual([])
  })
})

describe('CHANGELOG', () => {
  it('is newest first and starts with the current version', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version)
    for (let i = 1; i < CHANGELOG.length; i++) expect(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBeGreaterThan(0)
  })
})
