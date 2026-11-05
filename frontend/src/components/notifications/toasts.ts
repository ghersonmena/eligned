import { create } from 'zustand'
import type { AppNotification } from '../../api/types'

export type Toast = Pick<AppNotification, 'id' | 'kind' | 'task_id' | 'title' | 'body'>

interface ToastState {
  toasts: Toast[]
  push: (toast: Toast) => void
  dismiss: (id: string) => void
}

/** Live popups (newest last, at most 4 on screen). */
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => set((s) => ({ toasts: [...s.toasts.filter((t) => t.id !== toast.id), toast].slice(-4) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
