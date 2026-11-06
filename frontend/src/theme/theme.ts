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

/**
 * Switches <html data-theme>. When the theme really changes (not on page
 * load), the new one spreads from the top-left corner like a sunrise (to
 * light) or nightfall (to dark), with a warm or deep-blue glow behind it.
 * Browsers without View Transitions, or with reduced motion, switch at once.
 */
export function switchTheme(next: 'light' | 'dark') {
  const root = document.documentElement
  const current = root.dataset.theme
  if (current === next) return
  const canAnimate =
    current !== undefined && typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!canAnimate) {
    root.dataset.theme = next
    return
  }

  // Lives in the new page, so it shows through the growing circle and then fades by itself.
  const sky = document.createElement('div')
  sky.className = 'theme-sky'
  sky.dataset.to = next
  sky.setAttribute('aria-hidden', 'true')
  sky.addEventListener('animationend', () => sky.remove())

  root.classList.add('theme-switching')
  const transition = document.startViewTransition(() => {
    root.dataset.theme = next
    document.body.append(sky)
  })
  transition.ready
    .then(() => {
      const radius = Math.hypot(window.innerWidth, window.innerHeight)
      root.animate(
        { clipPath: ['circle(0px at 0 0)', `circle(${radius}px at 0 0)`] },
        { duration: REVEAL_MS, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => sky.remove())
  transition.finished.finally(() => root.classList.remove('theme-switching'))
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
