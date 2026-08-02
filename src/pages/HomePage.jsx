import { useMemo } from 'react'
import { Link } from 'wouter'
import { groupTasksByBucket } from '../utils/buckets'
import { getActivityHeatmap, summarizeHeatmap } from '../utils/analytics'
import { getDeadlineParts } from '../utils/dates'
import { TIMELINE_TICKS, getTodayTimeline } from '../utils/timeline'
import { RingStat } from '../components/RingStat'
import { MilestoneBar } from '../components/MilestoneBar'
import { ActivityGrid } from '../components/ActivityGrid'
import { isOverdue } from '../utils/overdue'
import { toDateStr } from '../utils/calendar'

const UPCOMING_LIMIT = 5
const HOME_HEATMAP_DAYS = 35

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage({ tasks: allTasks }) {
  const tasks = useMemo(() => allTasks.filter((task) => !task.archived), [allTasks])
  const buckets = useMemo(() => groupTasksByBucket(tasks), [tasks])
  const heatmap = useMemo(() => getActivityHeatmap(tasks, HOME_HEATMAP_DAYS), [tasks])
  const heatmapSummary = useMemo(() => summarizeHeatmap(heatmap), [heatmap])
  const timeline = useMemo(() => getTodayTimeline(tasks), [tasks])

  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => !task.done)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, UPCOMING_LIMIT),
    [tasks],
  )

  const todayTasks = buckets.today
  const todayDone = todayTasks.filter((task) => task.done).length

  const daily = useMemo(() => {
    const todayStr = toDateStr(new Date())
    const dueToday = tasks.filter((task) => task.deadline === todayStr)
    const overdueCount = tasks.filter((task) => isOverdue(task)).length
    const completedToday = tasks.filter(
      (task) => task.done && task.completedAt?.slice(0, 10) === todayStr,
    ).length
    const done = dueToday.filter((task) => task.done).length

    return {
      dueToday: dueToday.length,
      overdueCount,
      completedToday,
      done,
      percent: dueToday.length === 0 ? 0 : Math.round((done / dueToday.length) * 100),
    }
  }, [tasks])

  return (
    <main className="app-shell">
      <section className="home-top">
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

        <article className="entry-card home-timeline">
          <h2>Daily activity</h2>

          <div className="timeline">
            <div className="timeline-axis">
              {TIMELINE_TICKS.map((tick) => (
                <span
                  key={tick}
                  className="timeline-tick"
                  style={{ left: `${(tick / 24) * 100}%` }}
                />
              ))}

              {timeline.items.map((item) => (
                <span
                  key={item.key}
                  className={item.done ? 'timeline-point done' : 'timeline-point'}
                  style={{ left: `${item.position}%` }}
                  title={`${item.time} — ${item.title}`}
                />
              ))}

              <span className="timeline-now" style={{ left: `${timeline.nowPosition}%` }} />
            </div>

            <div className="timeline-scale" aria-hidden="true">
              {TIMELINE_TICKS.map((tick) => (
                <span key={tick}>{String(tick).padStart(2, '0')}</span>
              ))}
            </div>
          </div>

          {timeline.items.length === 0 ? (
            <p className="empty">No reminders set for today.</p>
          ) : (
            <ul className="timeline-list">
              {timeline.items.map((item) => (
                <li key={item.key}>
                  <span className="timeline-time">{item.time}</span>
                  <span className={item.done ? 'timeline-title done' : 'timeline-title'}>
                    {item.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="entry-card daily-card" aria-label="Today at a glance">
        <h2>Today at a glance</h2>

        <div className="daily-stats">
          <div className="daily-stat">
            <strong>{daily.dueToday}</strong>
            <span>due today</span>
          </div>
          <div className={daily.overdueCount > 0 ? 'daily-stat alert' : 'daily-stat'}>
            <strong>{daily.overdueCount}</strong>
            <span>overdue</span>
          </div>
          <div className="daily-stat">
            <strong>{daily.completedToday}</strong>
            <span>completed today</span>
          </div>
          <RingStat label="Today" value={daily.done} total={daily.dueToday} />
        </div>

        <MilestoneBar percent={daily.percent} label="Today's progress" />
      </section>

      <section className="home-grid" aria-label="Summary">
        <article className="bucket-column dark home-due">
          <div className="bucket-stat">
            <strong>{todayTasks.length}</strong>
            <span>due today</span>
          </div>

          <RingStat label="Cleared" value={todayDone} total={todayTasks.length} />
        </article>

        <article className="accent-card home-activity">
          <h2>Activity</h2>

          <div className="activity-stat">
            <strong>{heatmapSummary.activeDays}</strong>
            <span>days completed</span>
          </div>

          <ActivityGrid cells={heatmap} label="Task activity by day, last 5 weeks" />
        </article>

        <article className="entry-card home-upcoming">
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
        </article>
      </section>
    </main>
  )
}
