import { TaskCard } from './TaskCard'

export function BucketColumn({ label, tasks, onToggle, onDelete, onUpdate, onAddReminder, onRemoveReminder }) {
  return (
    <article className="bucket-column">
      <div className="bucket-header">
        <h3>{label}</h3>
        <span>{tasks.length}</span>
      </div>

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
