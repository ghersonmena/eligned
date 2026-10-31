import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import type { User } from './api/auth'
import { AppLayout } from './components/AppLayout'
import { GuestOnly, RequireUser } from './components/RouteGuards'
import { NAV_ITEMS } from './navigation'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { TasksPage } from './pages/TasksPage'

const withUser = (render: (user: User) => ReactNode) => <RequireUser>{render}</RequireUser>

export const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/registro', element: <GuestOnly><RegisterPage /></GuestOnly> },
  { path: '/revisa-tu-correo', element: <GuestOnly><CheckEmailPage /></GuestOnly> },
  {
    path: '/',
    element: withUser((user) => <AppLayout user={user} />),
    children: [
      { index: true, element: withUser((user) => <HomePage user={user} />) },
      { path: 'ajustes', element: withUser((user) => <SettingsPage user={user} />) },
      { path: 'tareas', element: <TasksPage /> },
      { path: 'tareas/:id', element: <TaskDetailPage /> },
      { path: 'proyectos', element: <ProjectsPage /> },
      { path: 'proyectos/:id', element: <ProjectDetailPage /> },
      ...NAV_ITEMS.filter((item) => item.phase).map((item) => ({
        path: item.to.slice(1),
        element: <ComingSoonPage item={item} />,
      })),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
