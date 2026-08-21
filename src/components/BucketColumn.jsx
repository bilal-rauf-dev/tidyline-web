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
  compact = false,
  onToggleCollapse,
  selectedIds = [],
  ...taskHandlers
}) {
  const [isOver, setIsOver] = useState(false)
  const isToday = bucketKey === 'today'
  const doneCount = tasks.filter((task) => task.done).length
  const percent = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100)

  function handleDrop(event) {
    event.preventDefault()
    setIsOver(false)
    const id = event.dataTransfer.getData('text/plain')
    if (id) onMoveTask(id, bucketKey)
  }

  const classNames = ['bucket-column', `bucket-${bucketKey}`]
  if (isToday) classNames.push('dark', 'bucket-sticky')
  if (isToday && compact) classNames.push('is-compact')
  if (isOver) classNames.push('drop-target')
  if (collapsed) classNames.push('collapsed')

  return (
    <article
      className={classNames.join(' ')}
      data-bucket-key={bucketKey}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setIsOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOver(false)
      }}
      onDrop={handleDrop}
    >
      <DistanceRail bucketKey={bucketKey} />

      <div className="bucket-header">
        {isToday ? (
          <div className="bucket-stat">
            <strong>{tasks.filter((task) => !task.done).length}</strong>
            <span>need attention</span>
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
          >
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      <div className="bucket-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${doneCount} of ${tasks.length} tasks done`}>
        <div className="bucket-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className={collapsed ? 'bucket-content collapsed' : 'bucket-content'} inert={collapsed ? true : undefined} aria-hidden={collapsed}>
        <div className="bucket-content-inner">
          {tasks.length === 0 ? (
            <p className="empty">Nothing here.</p>
          ) : (
            <ul className="task-list">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} selected={selectedIds.includes(task.id)} {...taskHandlers} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  )
}
