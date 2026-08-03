import { formatDate } from '../utils/dates'
import { TaskCard } from './TaskCard'

export function UpcomingSection({ tasks, selectedIds = [], ...taskHandlers }) {
  if (tasks.length === 0) {
    return null
  }

  return (
    <section className="upcoming-section" aria-label="Tasks waiting for their start date">
      <div className="upcoming-section-head">
        <div>
          <h2>Upcoming</h2>
          <p>Waiting for their start date</p>
        </div>
        <span>{tasks.length}</span>
      </div>

      <ul className="task-list upcoming-task-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={selectedIds.includes(task.id)}
            contextLabel={`Starts ${formatDate(task.startDate)}`}
            {...taskHandlers}
          />
        ))}
      </ul>
    </section>
  )
}
