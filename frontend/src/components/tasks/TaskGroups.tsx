import { useState } from 'react'
import type { Task } from '../../api/types'
import { dueGroup, GROUP_LABELS, GROUP_ORDER, type DueGroup } from '../../lib/dates'
import { Icon } from '../Icon'
import { TaskRow } from './TaskRow'
import styles from './tasks.module.css'

const GROUP_DOT: Record<DueGroup, string> = {
  overdue: '#DC2626',
  today: '#FB923C',
  tomorrow: '#0EA5E9',
  week: '#8B5CF6',
  later: '#16A34A',
  none: '#A8958A',
}

/** Open tasks grouped by due date (Atrasadas, Hoy, Mañana…), each group collapsible. */
export function TaskGroups({ tasks, showProject = true }: { tasks: Task[]; showProject?: boolean }) {
  const [collapsed, setCollapsed] = useState<Partial<Record<DueGroup, boolean>>>({})

  const groups = GROUP_ORDER.map((group) => ({
    group,
    tasks: tasks.filter((t) => dueGroup(t.due_at) === group),
  })).filter((g) => g.tasks.length > 0)

  return (
    <>
      {groups.map(({ group, tasks: groupTasks }) => {
        const open = !collapsed[group]
        return (
          <section key={group} className={styles.group} aria-label={GROUP_LABELS[group]}>
            <button
              type="button"
              className={styles.groupHeader}
              aria-expanded={open}
              onClick={() => setCollapsed({ ...collapsed, [group]: open })}
            >
              <Icon name="chevronDown" size={16} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: GROUP_DOT[group] }} />
              <span className={styles.groupTitle}>{GROUP_LABELS[group]}</span>
              <span className={styles.count}>{groupTasks.length}</span>
            </button>
            {open && (
              <ul className={styles.list}>
                {groupTasks.map((task) => (
                  <TaskRow key={task.id} task={task} showProject={showProject} />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </>
  )
}

/** Flat list (e.g. completed tasks). */
export function TaskList({ title, tasks, showProject = true }: { title: string; tasks: Task[]; showProject?: boolean }) {
  return (
    <section className={styles.group} aria-label={title}>
      <div className={styles.groupHeader} style={{ cursor: 'default' }}>
        <span className={styles.groupTitle}>{title}</span>
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <ul className={styles.list}>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} showProject={showProject} />
        ))}
      </ul>
    </section>
  )
}
