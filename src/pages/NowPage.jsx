import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'wouter'
import { formatDate } from '../utils/dates'
import { TagList } from '../components/TagList'
import { durationToMinutes, estimateTaskDuration, formatMinutes } from '../utils/calibration'
import { getFitAssessment, getTaskTimingLabel } from '../utils/timeAwareness'
import { rankNowTasks, rotateNowExclusions, selectNowTask } from '../utils/nowSelection'
import { useTimeTick } from '../hooks/useFlipReparent'

const CONTINUATION_MS = 5 * 60 * 1000

export function NowPage({ tasks, onComplete, onStart, onPause }) {
  const tick = useTimeTick()
  const referenceDate = useMemo(() => new Date(tick), [tick])
  const [skippedIds, setSkippedIds] = useState([])
  const [encouragement, setEncouragement] = useState(null)
  const continuationTimer = useRef(null)
  const primaryActionRef = useRef(null)
  const ranked = useMemo(() => rankNowTasks(tasks, referenceDate), [referenceDate, tasks])
  const next = useMemo(
    () => selectNowTask(tasks, referenceDate, skippedIds),
    [referenceDate, skippedIds, tasks],
  )
  const fit = next ? getFitAssessment(next, tasks, referenceDate) : null
  const expected = next ? estimateTaskDuration(next, tasks) : null
  const estimateMinutes = next ? durationToMinutes(next.duration) : null
  const firstStep = next?.checklist.find((item) => !item.done)

  useEffect(() => () => window.clearTimeout(continuationTimer.current), [])

  useEffect(() => {
    primaryActionRef.current?.focus()
  }, [next?.id])

  function fiveMoreMinutes() {
    if (!next) return
    if (!next.startedAt) onStart(next.id)
    window.clearTimeout(continuationTimer.current)
    setEncouragement({ taskId: next.id, message: 'Stay with this for five minutes. That is enough for now.' })
    continuationTimer.current = window.setTimeout(() => {
      setEncouragement({ taskId: next.id, message: 'Five minutes done. Keep going, finish, or choose another task.' })
    }, CONTINUATION_MS)
  }

  function chooseAnother() {
    if (!next || ranked.length <= 1) return
    if (next.startedAt) onPause(next.id)
    window.clearTimeout(continuationTimer.current)
    setEncouragement(null)
    setSkippedIds((current) => rotateNowExclusions(ranked, next.id, current))
  }

  function completeCurrent() {
    if (!next) return
    window.clearTimeout(continuationTimer.current)
    setEncouragement(null)
    onComplete(next.id)
  }

  return (
    <main className="app-shell now-shell">
      <header className="hero now-hero">
        <span className="welcome-kicker">Right now</span>
        <h1>Here’s what I’d do next.</h1>
        <p className="hero-copy">One task. No sorting required.</p>
      </header>

      {next ? (
        <section className={next.startedAt ? 'entry-card now-focus-card active' : 'entry-card now-focus-card'} aria-labelledby="now-task-title">
          <div className="now-focus-heading">
            <span className="home-feature-kicker">{next.startedAt ? 'In progress' : 'Start here'}</span>
          </div>
          <h2 id="now-task-title">{next.title}</h2>
          <p className="now-timing">
            {next.deadline
              ? `${getTaskTimingLabel(next, tasks, referenceDate)} · due ${formatDate(next.deadline)}`
              : getTaskTimingLabel(next, tasks, referenceDate)}
          </p>
          {fit && <p className={`fit-label fit-${fit.level}`}>{fit.label}</p>}

          <div className="now-context">
            <p>
              {estimateMinutes
                ? `Estimated ${formatMinutes(estimateMinutes)}${expected.source === 'calibrated' ? ` · usually ~${formatMinutes(expected.minutes)}` : ''}`
                : `Allow about ${formatMinutes(expected.minutes)}`}
            </p>
            {next.actualMinutes && <p>{formatMinutes(next.actualMinutes)} logged so far</p>}
            {firstStep && <p><strong>First step:</strong> {firstStep.text}</p>}
          </div>

          <TagList tags={next.tags} />

          <div className="now-actions" role="group" aria-label="Current task actions">
            <button ref={primaryActionRef} type="button" className="primary now-five" onClick={fiveMoreMinutes}>
              5 more minutes
            </button>
            <button type="button" className="secondary" onClick={completeCurrent}>Done</button>
            <button type="button" className="secondary" onClick={chooseAnother} disabled={ranked.length <= 1}>Not this</button>
          </div>

          <p className="now-encouragement" role="status" aria-live="polite">
            {encouragement?.taskId === next.id ? encouragement.message : ''}
          </p>

          <Link href={`/board?expand=${encodeURIComponent(next.id)}`} className="link-button">Open details</Link>
        </section>
      ) : (
        <section className="entry-card now-focus-card now-empty">
          <span className="home-feature-kicker">All clear</span>
          <h2>Nothing needs your attention.</h2>
          <p>Take the win. Add something only when it comes up.</p>
          <Link ref={primaryActionRef} href="/board?add=1" className="primary">Add a task</Link>
        </section>
      )}

      <Link href="/board" className="link-button now-board-link">See the full board</Link>
    </main>
  )
}
