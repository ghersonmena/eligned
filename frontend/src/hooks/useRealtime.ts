import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { User } from '../api/auth'
import type { AppNotification } from '../api/types'
import { useToasts } from '../components/notifications/toasts'
import { startRealtime } from '../lib/realtime'
import { currentWorkspace } from '../lib/workspace'
import { notificationsKey } from './useWorkspaceData'

/**
 * Live updates while the app is open:
 * - workspace channel: another tab/device changed tasks → refetch what's on screen;
 * - personal channel: a new notification → bell + popup (and a system
 *   notification when the tab is in the background and the person allowed it).
 */
export function useRealtime(user: User) {
  const client = useQueryClient()
  const ws = currentWorkspace(user)?.id
  const popups = user.preferences.popups

  useEffect(() => {
    if (!ws) return
    let cancelled = false
    let timer: number | undefined
    const cleanups: (() => void)[] = []

    void startRealtime().then((echo) => {
      if (!echo || cancelled) return

      const workspace = echo.private(`workspace.${ws}`)
      workspace.listen('.changed', () => {
        // A burst of changes becomes one refetch.
        window.clearTimeout(timer)
        timer = window.setTimeout(() => void client.invalidateQueries({ queryKey: ['ws', ws] }), 250)
      })
      cleanups.push(() => echo.leave(`workspace.${ws}`))

      const personal = echo.private(`App.Models.User.${user.id}`)
      personal.notification((n: AppNotification) => {
        void client.invalidateQueries({ queryKey: notificationsKey(ws) })
        if (!popups) return
        useToasts.getState().push(n)
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          const shown = new Notification(n.title, { body: n.body, tag: n.id, icon: '/pwa-192x192.png' })
          shown.onclick = () => {
            window.focus()
            location.assign(`/tareas/${n.task_id}`)
          }
        }
      })
      cleanups.push(() => echo.leave(`App.Models.User.${user.id}`))
    })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      cleanups.forEach((fn) => fn())
    }
  }, [client, ws, user.id, popups])
}
