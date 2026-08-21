import { useMemo } from 'react'
import { Link } from 'wouter'
import { Checkbox } from '../components/Checkbox'
import { PlusIcon } from '../components/icons'
import { toDateStr } from '../utils/calendar'
import { formatDate, getCountdownLabel } from '../utils/dates'
import { groupOverdue } from '../utils/overdue'
import { isTaskPlannedForToday, isTaskUpcoming } from '../utils/taskFields'
import { formatCapacitySummary, getCapacitySummary } from '../utils/workload'

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function dateAfter(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateStr(date)
}

function TaskRow({ task, onToggle, onTomorrow, onOpen }) {
  return (
    <li className="home-task-row" data-task-id={task.id}>
      <Checkbox checked={task.done} onChange={() => onToggle(task.id)} aria-label={`Complete ${task.title}`} />
      <button type="button" className="home-task-title" onClick={() => onOpen(task.id)}>{task.title}</button>
      <span className="countdown">{task.deadline ? getCountdownLabel(task.deadline) : 'No date'}</span>
      <button type="button" className="text-action" onClick={() => onTomorrow(task.id)}>Tomorrow</button>
      <button type="button" className="icon-mini" aria-label={`Open ${task.title}`} onClick={() => onOpen(task.id)}>→</button>
    </li>
  )
}

export function HomePage({
  tasks: allTasks,
  workspaceName = '',
  toggleTask = () => {},
  rescheduleTasks = () => {},
  onOpenTask = () => {},
  overloadHours = 6,
}) {
  const today = toDateStr(new Date())
  const tomorrow = dateAfter(1)
  const weekEnd = dateAfter(7)
  const tasks = useMemo(() => allTasks.filter((task) => !task.archived), [allTasks])
  const overdue = useMemo(() => groupOverdue(tasks), [tasks])
  const todayTasks = useMemo(() => tasks.filter((task) => !isTaskUpcoming(task) && (task.deadline === today || isTaskPlannedForToday(task))), [tasks, today])
  const upcoming = useMemo(() => {
    const grouped = new Map()
    tasks.filter((task) => task.deadline >= tomorrow && task.deadline <= weekEnd && !isTaskUpcoming(task) && !task.done).sort((a, b) => a.deadline.localeCompare(b.deadline)).forEach((task) => {
      if (!grouped.has(task.deadline)) grouped.set(task.deadline, [])
      grouped.get(task.deadline).push(task)
    })
    return [...grouped.entries()]
  }, [tasks, tomorrow, weekEnd])
  const capacity = getCapacitySummary(tasks, today, overloadHours)
  const pushTomorrow = (id) => rescheduleTasks([{ id, deadline: tomorrow }], 'home')

  return (
    <main className="app-shell home-shell home-actionable">
      <header className="home-overview-header">
        <div>
          <h1>{greeting()}{workspaceName ? `, ${workspaceName}` : ''}.</h1>
          <p>Plan what is due, act on what matters, and keep the week in view.</p>
        </div>
        <Link href="/board?add=1" className="home-add-action"><span className="home-add-mark" aria-hidden="true"><PlusIcon /></span>Add a task</Link>
      </header>

      {overdue.length > 0 && (
        <section className="home-overview-section home-overdue" aria-labelledby="home-overdue-title">
          <h2 id="home-overdue-title">Overdue</h2>
          {overdue.map((group) => (
            <div key={group.key} className="home-day-group">
              <h3>{group.label}</h3>
              <ul>{group.tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onTomorrow={pushTomorrow} onOpen={onOpenTask} />)}</ul>
            </div>
          ))}
        </section>
      )}

      <section className="home-overview-section home-today" aria-labelledby="home-today-title">
        <div className="home-section-heading">
          <h2 id="home-today-title">Today</h2>
          <p className={capacity.overBy > 0 ? 'capacity-statement over' : 'capacity-statement'}>{formatCapacitySummary(capacity)}</p>
        </div>
        {todayTasks.length ? <ul>{todayTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onTomorrow={pushTomorrow} onOpen={onOpenTask} />)}</ul> : <p className="empty">Nothing is due or planned today.</p>}
      </section>

      <section className="home-overview-section home-next-week" aria-labelledby="home-week-title">
        <div className="home-section-heading"><h2 id="home-week-title">Next 7 days</h2><Link href="/calendar">Open calendar</Link></div>
        {upcoming.length ? upcoming.map(([date, dayTasks]) => {
          const load = getCapacitySummary(tasks, date, overloadHours)
          return <div key={date} className="home-day-group"><div className="home-day-heading"><h3>{formatDate(date)}</h3><span>{formatCapacitySummary(load)}</span></div><ul>{dayTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onTomorrow={pushTomorrow} onOpen={onOpenTask} />)}</ul></div>
        }) : <p className="empty">No deadlines in the next seven days.</p>}
      </section>
    </main>
  )
}
