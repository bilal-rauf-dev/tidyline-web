import { useEffect, useMemo, useState } from 'react'
import { Link } from 'wouter'
import {
  getActivityHeatmap,
  getCompletionHistory,
  getCompletionStat,
  summarizeHeatmap,
} from '../utils/analytics'
import { formatDate, getCountdownLabel, getDeadlineParts } from '../utils/dates'
import { TIMELINE_TICKS, getTodayTimeline } from '../utils/timeline'
import { RingStat } from '../components/RingStat'
import { MilestoneBar } from '../components/MilestoneBar'
import { ActivityGrid } from '../components/ActivityGrid'
import { Sparkline } from '../components/Sparkline'
import { TagList } from '../components/TagList'
import { HomeDaybreak } from '../components/HomeDaybreak'
import { ShutdownDialog } from '../components/ShutdownDialog'
import { isOverdue } from '../utils/overdue'
import { toDateStr } from '../utils/calendar'
import { isTaskPlannedForToday, isTaskUpcoming } from '../utils/taskFields'

const UPCOMING_LIMIT = 6
const HOME_HEATMAP_DAYS = 35

const HOME_FEATURES = [
  {
    title: 'Plan by deadline',
    copy: 'Tasks find their place automatically, so your next step stays visible.',
  },
  {
    title: 'Make space for focus',
    copy: 'Use time blocks, reminders, and estimates to shape a day that feels doable.',
  },
  {
    title: 'Review and reset',
    copy: 'Close the day with a clear view of what moved forward and what can wait.',
  },
]

function getGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage({
  tasks: allTasks,
  workspaceName = '',
  setDeadline = () => {},
  archiveTask = () => {},
}) {
  const [shutdownOpen, setShutdownOpen] = useState(false)
  const [featureIndex, setFeatureIndex] = useState(0)
  const greeting = useMemo(() => getGreeting(), [])
  const tasks = useMemo(
    () => allTasks.filter((task) => !task.archived && task.deadline),
    [allTasks],
  )
  const heatmap = useMemo(() => getActivityHeatmap(tasks, HOME_HEATMAP_DAYS), [tasks])
  const heatmapSummary = useMemo(() => summarizeHeatmap(heatmap), [heatmap])
  const timeline = useMemo(() => getTodayTimeline(tasks), [tasks])
  const completion = useMemo(() => getCompletionStat(tasks), [tasks])
  const completionHistory = useMemo(() => getCompletionHistory(tasks), [tasks])
  const completionTrend = useMemo(() => {
    const fiveWeekHistory = getCompletionHistory(tasks, HOME_HEATMAP_DAYS)
    const weeklySeries = Array.from({ length: 5 }, (_, index) => {
      const count = fiveWeekHistory.series
        .slice(index * 7, index * 7 + 7)
        .reduce((total, point) => total + point.count, 0)

      return { count }
    })
    const current = weeklySeries.at(-1)?.count ?? 0
    const average = weeklySeries.reduce((total, week) => total + week.count, 0) / weeklySeries.length
    const peakIndex = weeklySeries.reduce(
      (peak, week, index) => (week.count > weeklySeries[peak].count ? index : peak),
      0,
    )

    return {
      weeklySeries,
      current,
      average,
      peakIndex,
      difference: current - average,
    }
  }, [tasks])
  const todayStr = toDateStr(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeatureIndex((current) => (current + 1) % HOME_FEATURES.length)
    }, 5500)

    return () => window.clearInterval(timer)
  }, [])

  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => !task.done)
        .filter((task) => task.deadline >= todayStr)
        .sort(
          (a, b) =>
            (a.startDate ?? a.deadline).localeCompare(b.startDate ?? b.deadline) ||
            a.deadline.localeCompare(b.deadline),
        )
        .slice(0, UPCOMING_LIMIT),
    [tasks, todayStr],
  )

  const daily = useMemo(() => {
    const today = toDateStr(new Date())
    const dueToday = tasks.filter(
      (task) =>
        !isTaskUpcoming(task) &&
        task.status !== 'waiting' &&
        (task.deadline === today || isTaskPlannedForToday(task)),
    )
    const overdueCount = tasks.filter((task) => isOverdue(task)).length
    const completedToday = tasks.filter(
      (task) => task.done && task.completedAt?.slice(0, 10) === today,
    ).length
    const done = dueToday.filter((task) => task.done).length

    return {
      dueToday: dueToday.length,
      overdueCount,
      completedToday,
      done,
    }
  }, [tasks])

  return (
    <>
      <main className="app-shell home-shell">
        <section className="home-dashboard" aria-label="Home dashboard">
          <header className="home-panel home-welcome">
            <div>
              <h1>{workspaceName ? `${greeting}` : greeting}</h1>
              <p>
                See what needs your attention, make a little progress, and leave the rest
                somewhere you can trust.
              </p>
            </div>
            <div className="home-actions">
              <Link href="/board?add=1" className="primary home-cta">
                Add a task
              </Link>
              <button
                type="button"
                className="secondary home-cta"
                onClick={() => setShutdownOpen(true)}
              >
                Review the day
              </button>
            </div>
          </header>

          <article className="entry-card home-timeline">
            <div className="home-card-heading">
              <h2>Daily activity</h2>
              <span>{timeline.items.length} scheduled</span>
            </div>

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

          <article className="bucket-column dark home-focus">
            <h2>Today at a glance</h2>
            <div className="bucket-stat">
              <strong>{daily.dueToday}</strong>
              <span>due or planned today</span>
            </div>

            <RingStat label="Cleared" value={daily.done} total={daily.dueToday} />

            <div className="home-focus-notes">
              <span><strong>{daily.overdueCount}</strong> overdue</span>
              <span><strong>{daily.completedToday}</strong> completed today</span>
            </div>
          </article>

          <section className="home-activity-pair" aria-label="Activity and weekly completion pace">
            <article className="home-panel home-activity">
              <div className="home-card-heading">
                <h2>Activity</h2>
                <span>Last 5 weeks</span>
              </div>
              <div className="activity-stat">
                <strong>{heatmapSummary.activeDays}</strong>
                <span>days with completed work</span>
              </div>
              <ActivityGrid cells={heatmap} label="Task activity by day, last 5 weeks" />
              <p className="card-note">
                {heatmapSummary.overdueDays} overdue {heatmapSummary.overdueDays === 1 ? 'day' : 'days'}
              </p>
            </article>

            <article className="home-panel home-completion-trend">
              <div className="home-card-heading">
                <h2>Weekly pace</h2>
                <span>5 weeks</span>
              </div>
              <div className="home-trend-stat">
                <strong>{completionTrend.current}</strong>
                <span>completed this week</span>
              </div>
              <Sparkline
                series={completionTrend.weeklySeries}
                peakIndex={completionTrend.peakIndex}
                height={52}
              />
              <p className="home-trend-note">
                {completionTrend.average === 0
                  ? 'No completed tasks in this five-week view yet.'
                  : `${Math.abs(completionTrend.difference).toFixed(1).replace(/\.0$/, '')} ${
                      completionTrend.difference >= 0 ? 'above' : 'below'
                    } your ${completionTrend.average.toFixed(1).replace(/\.0$/, '')}-task weekly average`}
              </p>
            </article>
          </section>

          <article className="home-panel home-daybreak">
            <div key={`feature-copy-${featureIndex}`} className="home-daybreak-copy home-feature-slide">
              <span className="home-feature-kicker">TidyLine in practice</span>
              <h2>{HOME_FEATURES[featureIndex].title}</h2>
              <p>{HOME_FEATURES[featureIndex].copy}</p>
            </div>
            <HomeDaybreak key={`feature-art-${featureIndex}`} variant={featureIndex} />
            <div className="home-feature-controls" aria-label="Home feature slideshow">
              <button
                type="button"
                className="home-feature-arrow"
                aria-label="Previous feature"
                onClick={() => setFeatureIndex((current) => (current - 1 + HOME_FEATURES.length) % HOME_FEATURES.length)}
              >
                ‹
              </button>
              <div className="home-feature-dots" aria-hidden="true">
                {HOME_FEATURES.map((feature, index) => (
                  <span key={feature.title} className={index === featureIndex ? 'active' : ''} />
                ))}
              </div>
              <button
                type="button"
                className="home-feature-arrow"
                aria-label="Next feature"
                onClick={() => setFeatureIndex((current) => (current + 1) % HOME_FEATURES.length)}
              >
                ›
              </button>
            </div>
          </article>

          <article className="accent-card home-progress">
            <h2>Overall progress</h2>
            <div className="home-progress-stat">
              <strong>{completion.percent}%</strong>
              <span>{completion.done} of {completion.total} tasks complete</span>
            </div>
            <MilestoneBar percent={completion.percent} label="All active tasks" />
          </article>

          <article className="entry-card home-upcoming">
            <div className="home-card-heading">
              <h2>Coming up</h2>
              <Link href="/calendar">Open calendar</Link>
            </div>

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
                      <div className="upcoming-copy">
                        <span className="upcoming-title">{task.title}</span>
                        <span className="upcoming-date">
                          {isTaskUpcoming(task)
                            ? `Starts ${formatDate(task.startDate)} · due ${formatDate(task.deadline)}`
                            : `${formatDate(task.deadline)} · ${getCountdownLabel(task.deadline)}`}
                        </span>
                        <TagList tags={task.tags} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </article>

          <article className="entry-card home-completion">
            <h2>Completion rhythm</h2>
            <p className="card-note">Actual completions over the last 14 days</p>
            <Sparkline
              series={completionHistory.series}
              peakIndex={completionHistory.peakIndex}
            />
            <div className="home-completion-stat">
              <strong>{completionHistory.total}</strong>
              <span>
                completed · peak {completionHistory.peakCount} on {formatDate(completionHistory.peakDate)}
              </span>
            </div>
          </article>
        </section>
      </main>

      {shutdownOpen && (
        <ShutdownDialog
          tasks={allTasks}
          setDeadline={setDeadline}
          archiveTask={archiveTask}
          onClose={() => setShutdownOpen(false)}
        />
      )}
    </>
  )
}
