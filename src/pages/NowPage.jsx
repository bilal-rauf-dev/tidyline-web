import { useMemo } from 'react'
import { Link } from 'wouter'
import { formatDate } from '../utils/dates'
import { TagList } from '../components/TagList'
import { durationToMinutes, estimateTaskDuration, formatMinutes } from '../utils/calibration'
import { getFitAssessment, getTaskAttentionDate, getTaskTimingLabel } from '../utils/timeAwareness'
import { useTimeTick } from '../hooks/useFlipReparent'

export function NowPage({ tasks, onComplete, onStart, onPause }) {
  const tick = useTimeTick()
  const referenceDate = useMemo(() => new Date(tick), [tick])
  const next = useMemo(() => tasks
    .filter((task) => !task.done && !task.archived)
    .sort((a, b) => {
      const aAttention = getTaskAttentionDate(a, tasks, referenceDate)
      const bAttention = getTaskAttentionDate(b, tasks, referenceDate)
      if (aAttention && bAttention && aAttention !== bAttention) return aAttention.localeCompare(bAttention)
      if (aAttention && !bAttention) return -1
      if (!aAttention && bAttention) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })[0], [referenceDate, tasks])
  const fit = next ? getFitAssessment(next, tasks, referenceDate) : null

  return (
    <main className="app-shell home-shell">
      <header className="hero">
        <h1>One clear next step.</h1>
        <p className="hero-copy">
          TidyLine uses your usual pace to bring forward work that needs to begin.
        </p>
      </header>

      {next ? (
        <section className="entry-card now-focus-card" aria-labelledby="now-task-title">
          <span className="home-feature-kicker">Start here</span>
          <h2 id="now-task-title">{next.title}</h2>
          <p>
            {next.deadline
              ? `${getTaskTimingLabel(next, tasks, referenceDate)} · due ${formatDate(next.deadline)}`
              : 'No deadline yet · kept in Later'}
          </p>
          {fit && <p className={`fit-label fit-${fit.level}`}>{fit.label}</p>}
          {next.duration && (
            <p className="card-note">
              Estimated {formatMinutes(durationToMinutes(next.duration))}
              {estimateTaskDuration(next, tasks).source === 'calibrated'
                ? ` · usually ~${formatMinutes(estimateTaskDuration(next, tasks).minutes)}`
                : ''}
            </p>
          )}
          <TagList tags={next.tags} />
          <div className="welcome-actions">
            <button type="button" className={next.startedAt ? 'secondary active' : 'primary'} onClick={() => (next.startedAt ? onPause(next.id) : onStart(next.id))}>
              {next.startedAt ? 'Pause' : next.actualMinutes ? 'Resume' : 'Start'}
            </button>
            <button type="button" className="primary" onClick={() => onComplete(next.id)}>Done</button>
            <Link href={`/board?expand=${encodeURIComponent(next.id)}`} className="secondary">Open details</Link>
          </div>
        </section>
      ) : (
        <section className="entry-card now-focus-card">
          <h2>Nothing needs your attention.</h2>
          <p className="card-note">Add a task when something comes up.</p>
          <Link href="/board?add=1" className="primary">Add a task</Link>
        </section>
      )}

      <Link href="/board" className="link-button">See the full board</Link>
    </main>
  )
}
