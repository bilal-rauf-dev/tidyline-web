import { useMemo } from 'react'
import {
  getActivityHeatmap,
  getBucketTrends,
  getBusiestDay,
  getCompletionStat,
  getCompletionHistory,
  getTopBuckets,
  summarizeHeatmap,
} from '../utils/analytics'
import { formatDate } from '../utils/dates'
import { MilestoneBar } from '../components/MilestoneBar'
import { RingStat } from '../components/RingStat'
import { Sparkline } from '../components/Sparkline'
import { TrendBars } from '../components/TrendBars'
import { ActivityGrid } from '../components/ActivityGrid'

export function AnalyticsPage({ tasks: allTasks }) {
  const tasks = useMemo(() => allTasks.filter((task) => !task.archived), [allTasks])
  const completion = useMemo(() => getCompletionStat(tasks), [tasks])
  const topBuckets = useMemo(() => getTopBuckets(tasks, 2), [tasks])
  const trends = useMemo(() => getBucketTrends(tasks), [tasks])
  const busiest = useMemo(() => getBusiestDay(tasks), [tasks])
  const heatmap = useMemo(() => getActivityHeatmap(tasks), [tasks])
  const heatmapSummary = useMemo(() => summarizeHeatmap(heatmap), [heatmap])
  const completionHistory = useMemo(() => getCompletionHistory(tasks), [tasks])

  const busiestBucket = trends.reduce(
    (top, entry) => (entry.count > top.count ? entry : top),
    trends[0],
  )

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Analytics</h1>
        <p className="hero-copy">
          A read of how tasks are completed and distributed, drawn straight
          from your board.
        </p>
      </header>

      <section className="analytics-grid" aria-label="Analytics">
        <article className="entry-card analytics-progress">
          <h2>Tasks completed</h2>

          <div className="analytics-progress-stat">
            <strong>{completion.percent}%</strong>
            <span>{completion.done} completed · {completion.total - completion.done} open</span>
          </div>

          <MilestoneBar percent={completion.percent} label="Total progress" />

          <div className="ring-tiles">
            {topBuckets.map((bucket) => (
              <RingStat
                key={bucket.bucket}
                label={bucket.label}
                value={bucket.done}
                total={bucket.total}
              />
            ))}
          </div>
        </article>

        <article className="bucket-column dark analytics-trend">
          <h2>Bucket trend</h2>
          <p className="card-note">Change vs. one week ago</p>
          <TrendBars entries={trends} accentKey={busiestBucket?.bucket} />
        </article>

        <article className="bucket-column dark analytics-peak">
          <h2>Busiest day</h2>
          <Sparkline series={busiest.series} peakIndex={busiest.peakIndex} />
          <div className="peak-stat">
            <strong>
              {busiest.peakCount}/{busiest.total}
            </strong>
            <span>
              due {busiest.total > 0 ? formatDate(busiest.peakDate) : 'nothing scheduled'}
            </span>
          </div>
        </article>

        <article className="entry-card analytics-velocity">
          <h2>Completion rhythm</h2>
          <p className="card-note">Actual completions over the last 14 days</p>
          <Sparkline
            series={completionHistory.series}
            peakIndex={completionHistory.peakIndex}
          />
          <div className="analytics-velocity-stat">
            <strong>{completionHistory.total}</strong>
            <span>
              completed · best day {completionHistory.peakCount}
            </span>
          </div>
        </article>

        <article className="accent-card analytics-activity">
          <h2>Activity</h2>

          <div className="activity-stat">
            <strong>{heatmapSummary.activeDays}</strong>
            <span>days completed</span>
          </div>

          <ActivityGrid cells={heatmap} label="Task activity by day, last 10 weeks" />

          <p className="card-note">
            {heatmapSummary.overdueDays} overdue {heatmapSummary.overdueDays === 1 ? 'day' : 'days'}
          </p>
        </article>
      </section>
    </main>
  )
}
