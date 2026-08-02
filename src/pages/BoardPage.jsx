import { useMemo, useState } from 'react'
import { useSearch } from 'wouter'
import { BUCKET_LABELS, BUCKET_ORDER, groupTasksByBucket } from '../utils/buckets'
import { TaskForm } from '../components/TaskForm'
import { BucketColumn } from '../components/BucketColumn'
import { BoardToolbar } from '../components/BoardToolbar'
import { UndoToast } from '../components/UndoToast'
import { DEFAULT_FILTERS, buildComparator, filterTasks } from '../utils/filters'
import { collectTags } from '../utils/tags'

export function BoardPage({
  tasks,
  addTask,
  updateTask,
  deleteTask,
  toggleTask,
  togglePin,
  archiveTask,
  unarchiveTask,
  duplicateTask,
  moveTaskToBucket,
  addReminder,
  removeReminder,
  bulkComplete,
  bulkArchive,
  bulkDelete,
  undoState,
  undo,
  dismissUndo,
}) {
  const search = useSearch()
  const focusForm = new URLSearchParams(search).get('add') === '1'

  const [view, setView] = useState('active')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  const tags = useMemo(() => collectTags(tasks), [tasks])

  const visible = useMemo(() => {
    const inView = tasks.filter((task) =>
      view === 'archived' ? task.archived : !task.archived,
    )
    return filterTasks(inView, filters)
  }, [tasks, view, filters])

  const buckets = useMemo(
    () => groupTasksByBucket(visible, new Date(), buildComparator(filters)),
    [visible, filters],
  )

  const matchCount = visible.length

  function toggleSelected(id) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  function exitSelection() {
    setSelectionMode(false)
    setSelectedIds([])
  }

  function runBulk(action) {
    if (selectedIds.length === 0) {
      return
    }

    action(selectedIds)
    exitSelection()
  }

  const taskHandlers = {
    allTasks: tasks,
    selectionMode,
    onSelect: toggleSelected,
    onToggle: toggleTask,
    onDelete: deleteTask,
    onUpdate: updateTask,
    onAddReminder: addReminder,
    onRemoveReminder: removeReminder,
    onTogglePin: togglePin,
    onArchive: archiveTask,
    onUnarchive: unarchiveTask,
    onDuplicate: duplicateTask,
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Reminder board</h1>
        <p className="hero-copy">
          Add a task, set its due date, attach one or more reminders, and it
          lands automatically in the right time bucket.
        </p>
      </header>

      <TaskForm onAddTask={addTask} allTasks={tasks} focusOnMount={focusForm} />

      <div className="board-controls">
        <div className="segmented" role="group" aria-label="View">
          <button
            type="button"
            className={view === 'active' ? 'segment active' : 'segment'}
            onClick={() => setView('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={view === 'archived' ? 'segment active' : 'segment'}
            onClick={() => setView('archived')}
          >
            Archived
          </button>
        </div>

        <span className="match-count">
          {matchCount} {matchCount === 1 ? 'task' : 'tasks'}
        </span>

        <button
          type="button"
          className="secondary"
          onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
        >
          {selectionMode ? 'Cancel selection' : 'Select'}
        </button>
      </div>

      <BoardToolbar filters={filters} onChange={setFilters} tags={tags} />

      {selectionMode && (
        <div className="bulk-bar" role="group" aria-label="Bulk actions">
          <span className="bulk-count">{selectedIds.length} selected</span>
          <button type="button" className="secondary" onClick={() => runBulk(bulkComplete)}>
            Complete
          </button>
          <button type="button" className="secondary" onClick={() => runBulk(bulkArchive)}>
            Archive
          </button>
          <button type="button" className="secondary danger" onClick={() => runBulk(bulkDelete)}>
            Delete
          </button>
        </div>
      )}

      <section className="buckets" aria-label="Task buckets">
        {BUCKET_ORDER.map((bucket) => (
          <BucketColumn
            key={bucket}
            bucketKey={bucket}
            label={BUCKET_LABELS[bucket]}
            tasks={buckets[bucket]}
            onMoveTask={moveTaskToBucket}
            selectedIds={selectedIds}
            {...taskHandlers}
          />
        ))}
      </section>

      {undoState && (
        <UndoToast message={undoState.message} onUndo={undo} onDismiss={dismissUndo} />
      )}
    </main>
  )
}
