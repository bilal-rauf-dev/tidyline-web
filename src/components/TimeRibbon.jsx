import { formatMinutes } from '../utils/calibration'
import { toDateStr } from '../utils/calendar'
import { getDayWorkload } from '../utils/timeAwareness'

const RIBBON_DAYS = 21

export function TimeRibbon({ tasks, referenceDate = new Date() }) {
  const days = Array.from({ length: RIBBON_DAYS }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + index)
    const dateStr = toDateStr(date)
    const workload = getDayWorkload(tasks, dateStr, tasks, referenceDate)
    const due = tasks.filter((task) => !task.done && !task.archived && task.deadline === dateStr).length
    return { date, dateStr, workload, due }
  })
  const peak = Math.max(1, ...days.map((day) => day.workload.minutes))

  return (
    <section className="time-ribbon" aria-label="Next three weeks of expected work and deadlines">
      <header>
        <div><span className="home-feature-kicker">Next three weeks</span><h2>Time ahead</h2></div>
        <p>Height shows how much work needs to begin. Dots mark deadlines.</p>
      </header>
      <div className="time-ribbon-scroll">
        <div className="time-ribbon-days">
          {days.map(({ date, dateStr, workload, due }) => (
            <article key={dateStr} className={workload.minutes ? 'time-ribbon-day has-work' : 'time-ribbon-day'} title={`${dateStr}: ${formatMinutes(workload.minutes)} to begin, ${due} due`}>
              <span>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}</span>
              <strong>{date.getDate()}</strong>
              <div className="time-ribbon-track" aria-hidden="true">
                <span style={{ height: `${Math.max(workload.minutes ? 10 : 0, (workload.minutes / peak) * 100)}%` }} />
              </div>
              <small>{workload.minutes ? formatMinutes(workload.minutes) : '—'}</small>
              <i className={due ? 'deadline-dots active' : 'deadline-dots'} aria-label={due ? `${due} deadline${due === 1 ? '' : 's'}` : 'No deadlines'}>{due || ''}</i>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
