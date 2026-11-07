import '@testing-library/jest-dom/vitest'

// The app is written in Spanish; tests read it in Spanish whatever the machine's language.
localStorage.setItem('idioma', 'es')
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
