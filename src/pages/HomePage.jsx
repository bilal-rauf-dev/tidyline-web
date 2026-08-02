import { useMemo } from 'react'
import { Link } from 'wouter'
import { groupTasksByBucket } from '../utils/buckets'
import { getActivityHeatmap } from '../utils/analytics'
import { getDeadlineParts } from '../utils/dates'

const UPCOMING_LIMIT = 5
const HOME_HEATMAP_DAYS = 35

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage({ tasks }) {
  const buckets = useMemo(() => groupTasksByBucket(tasks), [tasks])
  const heatmap = useMemo(() => getActivityHeatmap(tasks, HOME_HEATMAP_DAYS), [tasks])

  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => !task.done)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, UPCOMING_LIMIT),
    [tasks],
  )

  const dueToday = buckets.today.length

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>{getGreeting()}</h1>
        <p className="hero-copy">
          Here&rsquo;s where your deadlines stand today. Add what&rsquo;s on your
          mind and it lands in the right bucket automatically.
        </p>
        <Link href="/board?add=1" className="primary home-cta">
          Add a task
        </Link>
      </header>

      <section className="home-grid" aria-label="Summary">
        <div className="bucket-column dark home-due">
          <div className="bucket-stat">
            <strong>{dueToday}</strong>
            <span>due today</span>
          </div>
        </div>

        <div className="entry-card home-streak">
          <h2>Recent activity</h2>
          <div className="analytics-heatmap" aria-label="Completed tasks by day, last 5 weeks">
            {heatmap.map((cell, index) =>
              cell === null ? (
                <span key={`blank-${index}`} className="heatmap-dot empty" style={{ visibility: 'hidden' }} />
              ) : (
                <span
                  key={cell.dateStr}
                  className={cell.active ? 'heatmap-dot' : 'heatmap-dot empty'}
                  title={cell.dateStr}
                />
              ),
            )}
          </div>
        </div>

        <div className="entry-card home-upcoming">
          <h2>Coming up</h2>

          {upcoming.length === 0 ? (
            <p className="empty">Nothing scheduled yet.</p>
          ) : (
            <ul className="upcoming-list">
              {upcoming.map((task) => {
                const { day, month } = getDeadlineParts(task.deadline)

                return (
                  <li key={task.id}>
                    <div className="deadline-stat">
                      <strong>{day}</strong>
                      <span>{month}</span>
                    </div>
                    <span className="upcoming-title">{task.title}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}
