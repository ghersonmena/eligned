import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import type { User } from './api/auth'
import { AppLayout } from './components/AppLayout'
import { GuestOnly, RequireUser } from './components/RouteGuards'
import { NAV_ITEMS } from './navigation'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'

const withUser = (render: (user: User) => ReactNode) => <RequireUser>{render}</RequireUser>

export const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/registro', element: <GuestOnly><RegisterPage /></GuestOnly> },
  {
    path: '/',
    element: withUser((user) => <AppLayout user={user} />),
    children: [
      { index: true, element: withUser((user) => <HomePage user={user} />) },
      { path: 'ajustes', element: withUser((user) => <SettingsPage user={user} />) },
      ...NAV_ITEMS.filter((item) => item.phase).map((item) => ({
        path: item.to.slice(1),
        element: <ComingSoonPage item={item} />,
      })),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
