import { TaskCard } from './TaskCard'

export function BucketColumn({
  bucketKey,
  label,
  tasks,
  onToggle,
  onDelete,
  onUpdate,
  onAddReminder,
  onRemoveReminder,
}) {
  const isToday = bucketKey === 'today'

  return (
    <article className={`bucket-column bucket-${bucketKey}${isToday ? ' dark' : ''}`}>
      {isToday ? (
        <div className="bucket-stat">
          <strong>{tasks.length}</strong>
          <span>due today</span>
        </div>
      ) : (
        <div className="bucket-header">
          <h3>{label}</h3>
          <span className="count">{tasks.length}</span>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="empty">No tasks yet.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onAddReminder={onAddReminder}
              onRemoveReminder={onRemoveReminder}
            />
          ))}
        </ul>
      )}
    </article>
  )
}
