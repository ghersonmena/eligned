import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import type { User } from './api/auth'
import { AppLayout } from './components/AppLayout'
import { GuestOnly, RequireUser } from './components/RouteGuards'
import { NAV_ITEMS } from './navigation'
import { BoardPage } from './pages/BoardPage'
import { CalendarPage } from './pages/CalendarPage'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { HomePage } from './pages/HomePage'
import { InvitationPage } from './pages/InvitationPage'
import { LoginPage } from './pages/LoginPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { TaskNewPage } from './pages/TaskNewPage'
import { TasksPage } from './pages/TasksPage'
import { TeamPage } from './pages/TeamPage'
import { TimelinePage } from './pages/TimelinePage'

const withUser = (render: (user: User) => ReactNode) => <RequireUser>{render}</RequireUser>

export const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/registro', element: <GuestOnly><RegisterPage /></GuestOnly> },
  { path: '/revisa-tu-correo', element: <GuestOnly><CheckEmailPage /></GuestOnly> },
  // With or without a session.
  { path: '/invitacion/:token', element: <InvitationPage /> },
  {
    path: '/',
    element: withUser((user) => <AppLayout user={user} />),
    children: [
      { index: true, element: withUser((user) => <HomePage user={user} />) },
      { path: 'ajustes', element: withUser((user) => <SettingsPage user={user} />) },
      { path: 'tareas', element: <TasksPage /> },
      { path: 'tareas/nueva', element: <TaskNewPage /> },
      { path: 'tareas/:id', element: <TaskDetailPage /> },
      { path: 'tablero', element: <BoardPage /> },
      { path: 'calendario', element: <CalendarPage /> },
      { path: 'cronograma', element: <TimelinePage /> },
      { path: 'proyectos', element: <ProjectsPage /> },
      { path: 'proyectos/:id', element: <ProjectDetailPage /> },
      { path: 'equipo', element: withUser((user) => <TeamPage user={user} />) },
      ...NAV_ITEMS.filter((item) => item.phase).map((item) => ({
        path: item.to.slice(1),
        element: <ComingSoonPage item={item} />,
      })),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
