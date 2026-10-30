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

/** Keeps <html data-theme> in sync with the preference and, for "system", with the OS. */
export function useApplyTheme() {
  const preference = useThemeStore((s) => s.preference)

  useEffect(() => {
    const query = darkQuery()
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(preference, query.matches)
    }
    apply()
    if (preference !== 'system') return
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [preference])
}
