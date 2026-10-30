import { RouterProvider } from 'react-router'
import { router } from './router'
import { useApplyTheme } from './theme/theme'

export function App() {
  useApplyTheme()
  return <RouterProvider router={router} />
}
