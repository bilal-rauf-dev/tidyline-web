import { useState } from 'react'
import { TaskCard } from './TaskCard'
import { DistanceRail } from './DistanceRail'

export function BucketColumn({
  bucketKey,
  label,
  tasks,
  onMoveTask,
  selectedIds = [],
  ...taskHandlers
}) {
  const [isOver, setIsOver] = useState(false)
  const isToday = bucketKey === 'today'

  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOver(false)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsOver(false)

    const id = event.dataTransfer.getData('text/plain')

    if (id) {
      onMoveTask(id, bucketKey)
    }
  }

  const classNames = ['bucket-column', `bucket-${bucketKey}`]
  if (isToday) classNames.push('dark')
  if (isOver) classNames.push('drop-target')

  return (
    <article
      className={classNames.join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DistanceRail bucketKey={bucketKey} />

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
              selected={selectedIds.includes(task.id)}
              {...taskHandlers}
            />
          ))}
        </ul>
      )}
    </article>
  )
}
