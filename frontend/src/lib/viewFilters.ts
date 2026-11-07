import type { TaskFilters } from '../api/types'

export interface ViewFilterValues {
  mine: boolean
  projectId: string
}

export const NO_FILTERS: ViewFilterValues = { mine: false, projectId: '' }

export function toTaskFilters({ mine, projectId }: ViewFilterValues): TaskFilters {
  return {
    ...(mine ? { assignee: 'me' as const } : {}),
    ...(projectId ? { project_id: Number(projectId) } : {}),
  }
}
