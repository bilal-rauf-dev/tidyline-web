import { useMemo } from 'react'
import { BUCKET_LABELS, BUCKET_ORDER, groupTasksByBucket } from '../utils/buckets'
import { getActivityHeatmap, getCompletionStat } from '../utils/analytics'

export function AnalyticsPage({ tasks }) {
  const completion = useMemo(() => getCompletionStat(tasks), [tasks])
  const heatmap = useMemo(() => getActivityHeatmap(tasks), [tasks])
  const buckets = useMemo(() => groupTasksByBucket(tasks), [tasks])

  const bucketCounts = BUCKET_ORDER.map((bucket) => buckets[bucket].length)
  const maxCount = Math.max(1, ...bucketCounts)

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Analytics</h1>
        <p className="hero-copy">
          A read of how tasks are completed and distributed, drawn straight
          from your board.
        </p>
      </header>

      <section className="analytics-grid">
        <div className="bucket-column dark">
          <div className="bucket-stat">
            <strong>{completion.percent}%</strong>
            <span>
              {completion.done} of {completion.total} tasks completed
            </span>
          </div>
        </div>

        <div className="entry-card analytics-card">
          <h2>Completion streak</h2>
          <div className="analytics-heatmap" aria-label="Completed tasks by day, last 10 weeks">
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

        <div className="entry-card analytics-card analytics-breakdown">
          <h2>Tasks per bucket</h2>
          <div className="analytics-bars">
            {BUCKET_ORDER.map((bucket) => {
              const count = buckets[bucket].length
              const heightPct = (count / maxCount) * 100

              return (
                <div className="analytics-bar-col" key={bucket}>
                  <span className="analytics-bar-count">{count}</span>
                  <div className="analytics-bar-track">
                    <div
                      className={bucket === 'today' ? 'analytics-bar-fill accent' : 'analytics-bar-fill'}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="analytics-bar-label">{BUCKET_LABELS[bucket]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
