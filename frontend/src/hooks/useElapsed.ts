import { useEffect, useState } from 'react'

/** Seconds since `startedAt`, updated every second (null when nothing runs). */
export function useElapsed(startedAt: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [startedAt])
  if (!startedAt) return null
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
}

/** 0:04:09 */
export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
