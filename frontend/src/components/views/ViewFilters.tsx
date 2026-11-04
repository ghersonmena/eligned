import { useProjects } from '../../hooks/useWorkspaceData'
import type { ViewFilterValues } from '../../lib/viewFilters'
import taskStyles from '../tasks/tasks.module.css'

/** "Todas / Asignadas a mí" and the project picker, shared by the views. */
export function ViewFilters({ value, onChange }: { value: ViewFilterValues; onChange: (v: ViewFilterValues) => void }) {
  const { data: projects = [] } = useProjects()
  return (
    <>
      <div className={taskStyles.segmented} role="group" aria-label="Mostrar">
        <button type="button" className={taskStyles.segment} aria-pressed={!value.mine} onClick={() => onChange({ ...value, mine: false })}>
          Todas
        </button>
        <button type="button" className={taskStyles.segment} aria-pressed={value.mine} onClick={() => onChange({ ...value, mine: true })}>
          Asignadas a mí
        </button>
      </div>
      {projects.length > 0 && (
        <select
          className={taskStyles.select}
          aria-label="Filtrar por proyecto"
          value={value.projectId}
          onChange={(e) => onChange({ ...value, projectId: e.target.value })}
        >
          <option value="">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </>
  )
}
