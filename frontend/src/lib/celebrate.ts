import confetti from 'canvas-confetti'

const COLORS = ['#FB923C', '#C2410C', '#2DD4BF', '#38BDF8', '#FDBA74', '#16A34A', '#8B5CF6', '#FACC15']

/**
 * Confetti burst for a completed task. Skipped automatically when the user
 * asked the OS to reduce motion, or turned it off in their preferences.
 */
export function celebrate(enabled = true) {
  if (!enabled) return
  const shared = { colors: COLORS, disableForReducedMotion: true, ticks: 220 }
  void confetti({ ...shared, particleCount: 90, spread: 70, origin: { x: 0.3, y: 0.35 } })
  void confetti({ ...shared, particleCount: 90, spread: 70, origin: { x: 0.7, y: 0.35 } })
}
