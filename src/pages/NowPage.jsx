import { Link } from 'wouter'
import { formatDate, getCountdownLabel } from '../utils/dates'
import { TagList } from '../components/TagList'

function byAttention(a, b) {
  if (!a.deadline && !b.deadline) return a.createdAt.localeCompare(b.createdAt)
  if (!a.deadline) return 1
  if (!b.deadline) return -1
  return a.deadline.localeCompare(b.deadline)
}

export function NowPage({ tasks, onComplete }) {
  const next = tasks
    .filter((task) => !task.done && !task.archived)
    .sort(byAttention)[0]

  return (
    <main className="app-shell home-shell">
      <header className="hero">
        <h1>One clear next step.</h1>
        <p className="hero-copy">
          TidyLine is becoming more automatic. For now, the nearest open deadline leads.
        </p>
      </header>

      {next ? (
        <section className="entry-card now-focus-card" aria-labelledby="now-task-title">
          <span className="home-feature-kicker">Start here</span>
          <h2 id="now-task-title">{next.title}</h2>
          <p>
            {next.deadline
              ? `${getCountdownLabel(next.deadline)} · due ${formatDate(next.deadline)}`
              : 'No deadline yet · kept in Later'}
          </p>
          {next.duration && (
            <p className="card-note">
              Estimated {next.duration.value}{next.duration.unit === 'hr' ? 'h' : 'm'}
            </p>
          )}
          <TagList tags={next.tags} />
          <div className="welcome-actions">
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
