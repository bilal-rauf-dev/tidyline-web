import { TaskCard } from './TaskCard'

/**
 * Overdue work is pulled out of Today into its own section so a missed
 * deadline never sits silently beside on-time work. Tiers are ordered worst
 * first and gain prominence via border weight + accent intensity only.
 */
export function OverdueSection({ groups, selectedIds = [], ...taskHandlers }) {
  if (groups.length === 0) {
    return null
  }

  const total = groups.reduce((sum, group) => sum + group.tasks.length, 0)

  return (
    <section className="overdue-section" aria-label="Overdue tasks">
      <div className="overdue-head">
        <h2>Overdue</h2>
        <span className="overdue-total">{total}</span>
      </div>

      <div className="overdue-groups">
        {groups.map((group) => (
          <article key={group.key} className={`overdue-group severity-${group.severity}`}>
            <div className="overdue-group-head">
              <h3>{group.label}</h3>
              <span>{group.tasks.length}</span>
            </div>

            <ul className="task-list">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={selectedIds.includes(task.id)}
                  {...taskHandlers}
                />
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
