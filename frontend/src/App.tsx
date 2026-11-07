import { RouterProvider } from 'react-router'
import { useLocaleStore } from './lib/i18n'
import { router } from './router'
import { useApplyTheme } from './theme/theme'

export function App() {
  useApplyTheme()
  // A new language remounts everything, so every text is read again in it.
  const locale = useLocaleStore((s) => s.locale)
  return <RouterProvider key={locale} router={router} />
}
