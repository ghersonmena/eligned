import { tk } from './i18n'

/**
 * What changed in each version, newest first. The first entry is the app's
 * current version. Add an entry with every release (texts in Spanish, with
 * their English in locales/en/changelog.json): people see it once, in the
 * "Esto es lo nuevo" screen, the next time they open the app.
 */
export interface Release {
  version: string
  /** Release day, "YYYY-MM-DD". */
  date: string
  changes: { title: string; text: string }[]
}

export const CHANGELOG: Release[] = [
  {
    version: '1.0.1',
    date: '2026-11-12',
    changes: [
      {
        title: tk('Hora de inicio'),
        text: tk('La fecha de inicio ahora también guarda la hora. Al elegir el día se anota la hora actual, y puedes cambiarla o borrarla.'),
      },
      {
        title: tk('Esto es lo nuevo'),
        text: tk('Cada vez que la app se actualice verás aquí qué cambió, una sola vez. También puedes volver a verlo en Ajustes.'),
      },
    ],
  },
]

/** Version this build is. */
export const APP_VERSION = CHANGELOG[0].version

/** Negative when a < b, positive when a > b ("1.0.10" > "1.0.9"). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Releases the person hasn't seen yet. Without a seen version (they never
 * closed the screen), only releases after their account was created count,
 * so a brand-new account doesn't get old news.
 */
export function unseenReleases(seenVersion: string | null, createdAt: string | null, list: Release[] = CHANGELOG): Release[] {
  if (seenVersion) return list.filter((r) => compareVersions(r.version, seenVersion) > 0)
  if (!createdAt) return []
  const created = createdAt.slice(0, 10)
  return list.filter((r) => r.date > created)
}
