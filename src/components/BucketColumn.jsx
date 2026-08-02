import { useState } from 'react'
import { TaskCard } from './TaskCard'
import { DistanceRail } from './DistanceRail'
import { ChevronDownIcon } from './icons'

export function BucketColumn({
  bucketKey,
  label,
  tasks,
  onMoveTask,
  collapsed = false,
  onToggleCollapse,
  selectedIds = [],
  ...taskHandlers
}) {
  const [isOver, setIsOver] = useState(false)
  const isToday = bucketKey === 'today'

  const doneCount = tasks.filter((task) => task.done).length
  const percent = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100)

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
  if (isToday) classNames.push('dark', 'bucket-sticky')
  if (isOver) classNames.push('drop-target')
  if (collapsed) classNames.push('collapsed')

  return (
    <article
      className={classNames.join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DistanceRail bucketKey={bucketKey} />

      <div className="bucket-header">
        {isToday ? (
          <div className="bucket-stat">
            <strong>{tasks.length}</strong>
            <span>due today</span>
          </div>
        ) : (
          <h3>{label}</h3>
        )}

        <div className="bucket-header-side">
          {!isToday && <span className="count">{tasks.length}</span>}
          <button
            type="button"
            className="icon-mini bucket-collapse"
            onClick={() => onToggleCollapse(bucketKey)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label}`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      <div
        className="bucket-progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${doneCount} of ${tasks.length} done`}
      >
        <div className="bucket-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      {!collapsed &&
        (tasks.length === 0 ? (
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
        ))}
    </article>
  )
}
