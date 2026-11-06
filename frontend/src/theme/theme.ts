import { useEffect } from 'react'
import { create } from 'zustand'
import type { ThemePreference } from '../api/auth'

const STORAGE_KEY = 'theme'

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): 'light' | 'dark' {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Storage can be blocked (private mode); fall back to the system theme.
  }
  return 'system'
}

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readStored(),
  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // Ignore: the theme still applies for this session.
    }
    set({ preference })
  },
}))

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

const REVEAL_MS = 1100

let running: ViewTransition | null = null
/** Theme the running animation is heading to (data-theme changes a moment later). */
let target: string | undefined

/**
 * Switches <html data-theme>. When the theme really changes (not on page
 * load), the new one spreads from the top-left corner like a sunrise (to
 * light) or nightfall (to dark), with a warm or deep-blue glow behind it.
 * Browsers without View Transitions, or with reduced motion, switch at once.
 */
export function switchTheme(next: 'light' | 'dark') {
  const root = document.documentElement
  const current = target ?? root.dataset.theme
  if (current === next) return
  // A second tap mid-animation: finish the first one at once and start again.
  running?.skipTransition()
  const canAnimate =
    current !== undefined && typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!canAnimate) {
    running = null
    target = undefined
    root.classList.remove('theme-switching')
    root.dataset.theme = next
    return
  }

  // Lives in the new page, so it shows through the growing circle and then fades by itself.
  const sky = document.createElement('div')
  sky.className = 'theme-sky'
  sky.dataset.to = next
  sky.setAttribute('aria-hidden', 'true')
  sky.addEventListener('animationend', () => sky.remove())

  // The circle is a CSS animation (global.css), so it is clipped from the very
  // first frame; starting it from JS left a frame with the whole new theme
  // showing (a white flash when going to light).
  root.style.setProperty('--reveal-radius', `${Math.ceil(Math.hypot(window.innerWidth, window.innerHeight))}px`)
  root.style.setProperty('--reveal-ms', `${REVEAL_MS}ms`)
  root.classList.add('theme-switching')
  const transition = document.startViewTransition(() => {
    root.dataset.theme = next
    document.body.append(sky)
  })
  running = transition
  target = next
  transition.ready.catch(() => sky.remove())
  transition.finished.finally(() => {
    if (running !== transition) return
    running = null
    target = undefined
    root.classList.remove('theme-switching')
  })
}

/** Keeps <html data-theme> in sync with the preference and, for "system", with the OS. */
export function useApplyTheme() {
  const preference = useThemeStore((s) => s.preference)

  useEffect(() => {
    const query = darkQuery()
    const apply = () => {
      switchTheme(resolveTheme(preference, query.matches))
    }
    apply()
    if (preference !== 'system') return
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [preference])
}
