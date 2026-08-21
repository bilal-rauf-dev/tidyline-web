import { useEffect, useMemo, useState } from 'react'
import { BoardToolbar } from '../components/BoardToolbar'
import { Checkbox } from '../components/Checkbox'
import { SavedFilterBar } from '../components/SavedFilterBar'
import { TagList } from '../components/TagList'
import { buildComparator, DEFAULT_FILTERS, filterTasks } from '../utils/filters'
import { collectTags } from '../utils/tags'
import { formatDate, getCountdownLabel } from '../utils/dates'
import { PRIORITY_OPTIONS } from '../utils/taskFields'

const COLUMNS = [
  { key: 'title', label: 'Title', sortBy: 'title' }, { key: 'tags', label: 'Tags', sortBy: 'tags' },
  { key: 'priority', label: 'Priority', sortBy: 'priority' },
  { key: 'deadline', label: 'Deadline', sortBy: 'deadline' }, { key: 'duration', label: 'Duration', sortBy: 'duration' },
]

function durationLabel(duration) {
  if (!duration) return '—'
  return `${duration.value}${duration.unit === 'hr' ? 'h' : 'm'}`
}

export function ListPage({
  tasks,
  toggleTask,
  updateTask,
  selectedIds = [],
  onSelectedIdsChange = () => {},
  focusedTaskId = null,
  onFocusedTaskChange = () => {},
  onOpenTask = () => {},
  savedFilters = [],
  onSaveFilter = () => null,
  onDeleteFilter = () => {},
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const tags = useMemo(() => collectTags(tasks), [tasks])
  const rows = useMemo(() => {
    const filtered = filterTasks(tasks.filter((task) => !task.archived), filters)
    return [...filtered].sort(buildComparator(filters))
  }, [tasks, filters])

  useEffect(() => {
    if (rows[0] && !rows.some((task) => task.id === focusedTaskId)) onFocusedTaskChange(rows[0].id)
  }, [focusedTaskId, onFocusedTaskChange, rows])

  function toggleSelection(id) {
    onSelectedIdsChange(selectedIds.includes(id) ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id])
  }

  function sortBy(key) {
    if (!key) return
    setFilters((current) => ({ ...current, sortBy: key, sortDir: current.sortBy === key && current.sortDir === 'asc' ? 'desc' : 'asc' }))
  }

  return (
    <main className="app-shell list-shell">
      <header className="hero"><h1>All tasks</h1><p className="hero-copy">One dense, sortable view of every active and undated task.</p></header>
      <div className="list-tools">
        <SavedFilterBar savedFilters={savedFilters} onApply={setFilters} onSave={(name) => onSaveFilter(name, filters)} onDelete={onDeleteFilter} />
        <BoardToolbar filters={filters} onChange={setFilters} tags={tags} />
        <span className="match-count">{rows.length} tasks</span>
      </div>
      <div className="task-table-wrap">
        <table className="task-table">
          <thead><tr><th scope="col">Select</th><th scope="col">Done</th>{COLUMNS.map((column) => <th key={column.key} scope="col"><button type="button" className="table-sort" disabled={!column.sortBy} onClick={() => sortBy(column.sortBy)}>{column.label}{filters.sortBy === column.sortBy ? (filters.sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>)}<th scope="col">Open</th></tr></thead>
          <tbody>
            {rows.map((task) => (
              <tr key={task.id} data-task-id={task.id} data-list-row tabIndex={task.id === focusedTaskId ? 0 : -1} onFocus={() => onFocusedTaskChange(task.id)}>
                <td><Checkbox checked={selectedIds.includes(task.id)} onChange={() => toggleSelection(task.id)} aria-label={`Select ${task.title}`} /></td>
                <td><Checkbox checked={task.done} onChange={() => toggleTask(task.id)} aria-label={`Complete ${task.title}`} /></td>
                <td><button type="button" className="list-title" onClick={() => onOpenTask(task.id)}>{task.title}</button></td>
                <td><TagList tags={task.tags} /></td>
                <td><select className="list-inline-select" value={task.priority ?? ''} aria-label={`Priority for ${task.title}`} onChange={(event) => updateTask(task.id, { priority: event.target.value || null })}>{PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td>
                <td>{task.deadline ? <label className="list-deadline"><span>{formatDate(task.deadline)} · {getCountdownLabel(task.deadline)}</span><input type="date" value={task.deadline} aria-label={`Deadline for ${task.title}`} onChange={(event) => updateTask(task.id, { deadline: event.target.value || null })} /></label> : <label className="list-deadline"><span>No date</span><input type="date" aria-label={`Set deadline for ${task.title}`} onChange={(event) => updateTask(task.id, { deadline: event.target.value || null })} /></label>}</td>
                <td>{durationLabel(task.duration)}</td>
                <td><button type="button" className="icon-mini" aria-label={`Open ${task.title}`} onClick={() => onOpenTask(task.id)}>→</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
