import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { ProjectInput, Task, TaskFilters, TaskInput, TaskStatus } from '../api/types'
import { workspaceApi } from '../api/workspace'
import { useMe } from './useAuth'

/**
 * Query keys. Everything about a workspace starts with ['ws', id] so a single
 * invalidation refreshes lists, counts and details after a change.
 */
export const keys = {
  all: (ws: number) => ['ws', ws] as const,
  tasks: (ws: number, filters: TaskFilters) => ['ws', ws, 'tasks', filters] as const,
  task: (ws: number, id: number) => ['ws', ws, 'task', id] as const,
  projects: (ws: number) => ['ws', ws, 'projects'] as const,
  project: (ws: number, id: number) => ['ws', ws, 'project', id] as const,
  statuses: (ws: number) => ['ws', ws, 'statuses'] as const,
  members: (ws: number) => ['ws', ws, 'members'] as const,
}

/** The workspace the user is working in. For now, their first (personal) one. */
export function useWorkspaceId(): number {
  const { data: user } = useMe()
  const id = user?.workspaces[0]?.id
  if (!id) throw new Error('El usuario no tiene espacio de trabajo')
  return id
}

/**
 * Refetches everything of the workspace in the background. Not awaited on
 * purpose: the mutation finishes (and the UI moves on) as soon as the server
 * confirmed the change.
 */
const refreshWorkspace = (client: QueryClient, ws: number) => {
  void client.invalidateQueries({ queryKey: keys.all(ws) })
}

/* ---------- Reads ---------- */

export function useTasks(filters: TaskFilters, enabled = true) {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: keys.tasks(ws, filters), queryFn: () => workspaceApi.tasks(ws, filters), enabled })
}

export function useTask(id: number) {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: keys.task(ws, id), queryFn: () => workspaceApi.task(id) })
}

export function useProjects() {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: keys.projects(ws), queryFn: () => workspaceApi.projects(ws) })
}

export function useProject(id: number) {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: keys.project(ws, id), queryFn: () => workspaceApi.project(id) })
}

export function useStatuses() {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: keys.statuses(ws), queryFn: () => workspaceApi.statuses(ws), staleTime: Infinity })
}

export function useMembers() {
  const ws = useWorkspaceId()
  return useQuery({ queryKey: keys.members(ws), queryFn: () => workspaceApi.members(ws), staleTime: 5 * 60_000 })
}

/* ---------- Task writes ---------- */

export function useCreateTask() {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: TaskInput) => workspaceApi.createTask(ws, input),
    onSuccess: () => refreshWorkspace(client, ws),
  })
}

/**
 * Edits a task. Changes show up immediately in every cached list and detail
 * (optimistic update) and are rolled back if the server rejects them.
 */
export function useUpdateTask() {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskInput }) => workspaceApi.updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await client.cancelQueries({ queryKey: keys.all(ws) })
      const snapshot = client.getQueriesData({ queryKey: keys.all(ws) })
      // Patches the task wherever it appears, including as a subtask inside a list or detail.
      const patch = (task: Task): Task => {
        const self = task.id === id ? { ...task, ...pickPatchable(input) } : task
        return self.subtasks ? { ...self, subtasks: self.subtasks.map(patch) } : self
      }

      client.setQueriesData<unknown>({ queryKey: keys.all(ws) }, (data: unknown) => {
        if (Array.isArray(data)) return (data as unknown[]).map((t) => (isTask(t) ? patch(t) : t))
        if (isTask(data)) return patch(data)
        return data
      })
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data))
    },
    onSettled: () => {
      refreshWorkspace(client, ws)
    },
  })
}

/**
 * Kanban: drops a card in a column at an index. Board lists (sort=position)
 * are reordered right away; everything is refetched afterwards.
 */
export function useMoveTask() {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, index }: { id: number; status: TaskStatus; index: number }) =>
      workspaceApi.moveTask(id, status.id, index),
    onMutate: async ({ id, status, index }) => {
      await client.cancelQueries({ queryKey: keys.all(ws) })
      const snapshot = client.getQueriesData({ queryKey: keys.all(ws) })
      client.setQueriesData<Task[]>(
        { queryKey: ['ws', ws, 'tasks'], predicate: (q) => (q.queryKey[3] as TaskFilters | undefined)?.sort === 'position' },
        (tasks) => (tasks ? moveInList(tasks, id, status, index) : tasks),
      )
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data))
    },
    onSettled: () => refreshWorkspace(client, ws),
  })
}

/** Pure reorder used by the optimistic update (exported for tests). */
export function moveInList(tasks: Task[], id: number, status: TaskStatus, index: number): Task[] {
  const moving = tasks.find((t) => t.id === id)
  if (!moving) return tasks
  const updated: Task = {
    ...moving,
    status_id: status.id,
    completed: status.is_done,
    completed_at: status.is_done ? (moving.completed_at ?? new Date().toISOString()) : null,
  }
  const column = tasks.filter((t) => t.status_id === status.id && t.id !== id)
  column.splice(Math.min(index, column.length), 0, updated)
  const renumbered = column.map((t, position) => ({ ...t, position }))
  const others = tasks.filter((t) => t.status_id !== status.id && t.id !== id)
  return [...others, ...renumbered]
}

export function useDeleteTask() {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workspaceApi.deleteTask(id),
    onSuccess: (_data, id) => {
      // Drop the deleted task right away so nothing tries to reload it.
      client.removeQueries({ queryKey: keys.task(ws, id) })
      refreshWorkspace(client, ws)
    },
  })
}

export function useCreateSubtask(taskId: number) {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => workspaceApi.createSubtask(taskId, { title }),
    onSuccess: () => refreshWorkspace(client, ws),
  })
}

export function useAddComment(taskId: number) {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => workspaceApi.addComment(taskId, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.task(ws, taskId) })
    },
  })
}

export function useDeleteComment(taskId: number) {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workspaceApi.deleteComment(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.task(ws, taskId) })
    },
  })
}

/* ---------- Project writes ---------- */

export function useCreateProject() {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectInput) => workspaceApi.createProject(ws, input),
    onSuccess: () => refreshWorkspace(client, ws),
  })
}

export function useUpdateProject() {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProjectInput }) => workspaceApi.updateProject(id, input),
    onSuccess: () => refreshWorkspace(client, ws),
  })
}

export function useDeleteProject() {
  const ws = useWorkspaceId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workspaceApi.deleteProject(id),
    onSuccess: () => refreshWorkspace(client, ws),
  })
}

/* ---------- helpers ---------- */

function isTask(value: unknown): value is Task {
  return typeof value === 'object' && value !== null && 'title' in value && 'status_id' in value
}

/** Fields that can be shown optimistically without the server's answer. */
function pickPatchable(input: TaskInput): Partial<Task> {
  const rest: TaskInput = { ...input }
  delete rest.assignee_ids
  return rest as Partial<Task>
}
