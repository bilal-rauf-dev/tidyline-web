import { useMemo, useState } from 'react'
import { useSearch } from 'wouter'
import { BUCKET_LABELS, BUCKET_ORDER, groupTasksByBucket } from '../utils/buckets'
import { DEFAULT_FILTERS, filterTasks } from '../utils/filters'
import { TaskForm } from '../components/TaskForm'
import { BucketColumn } from '../components/BucketColumn'
import { BoardToolbar } from '../components/BoardToolbar'
import { UndoToast } from '../components/UndoToast'
import { ArchiveIcon } from '../components/icons'
import { useTimeTick } from '../hooks/useFlipReparent'

export function BoardPage({
  tasks,
  addTask,
  moveTaskToBucket,
  bulkComplete,
  bulkArchive,
  bulkDelete,
  undoState,
  undo,
  dismissUndo,
  ...taskActions
}) {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const focusForm = params.get('add') === '1'
  const expandTaskId = params.get('expand')
  const prefilledTitle = params.get('title') || ''
  const prefilledDeadline = params.get('deadline') || ''
  const prefilledTags = params.get('tags') || ''

  const prefilledDetails = (() => {
    const details = {}
    const durationMinutes = params.get('durationMinutes')
    if (durationMinutes) {
      details.durationValue = durationMinutes
      details.durationUnit = 'min'
    }

    const recurrence = params.get('recurrence')
    if (recurrence) {
      try {
        details.recurrence = JSON.parse(recurrence)
      } catch {
        details.recurrence = null
      }
    }

    return Object.keys(details).length ? details : null
  })()

  const prefilledReminders = (() => {
    const minutes = Number(params.get('reminderMinutes'))
    return minutes > 0
      ? [{ id: `rel:${minutes}`, kind: 'relative', minutesBefore: minutes }]
      : null
  })()

  const tick = useTimeTick()
  const now = useMemo(() => new Date(tick), [tick])
  const [view, setView] = useState(params.get('view') === 'archived' ? 'archived' : 'active')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [collapsedBuckets, setCollapsedBuckets] = useState([])

  const visible = useMemo(() => {
    const inView = tasks.filter((task) => (view === 'archived' ? task.archived : !task.archived))
    return filterTasks(inView, filters)
  }, [filters, tasks, view])

  const buckets = useMemo(() => groupTasksByBucket(visible, now), [now, visible])

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
    if (selectedIds.length === 0) return
    action(selectedIds)
    exitSelection()
  }

  const taskHandlers = {
    allTasks: tasks,
    selectionMode,
    onSelect: toggleSelected,
    onToggle: taskActions.toggleTask,
    onDelete: taskActions.deleteTask,
    onUpdate: taskActions.updateTask,
    onTogglePin: taskActions.togglePin,
    onArchive: taskActions.archiveTask,
    onUnarchive: taskActions.unarchiveTask,
    onDuplicate: taskActions.duplicateTask,
    onSetRecurrence: taskActions.setRecurrence,
    onAddReminder: taskActions.addReminder,
    onRemoveReminder: taskActions.removeReminder,
    onAddChecklistItem: taskActions.addChecklistItem,
    onToggleChecklistItem: taskActions.toggleChecklistItem,
    onRemoveChecklistItem: taskActions.removeChecklistItem,
    onMoveChecklistItem: taskActions.moveChecklistItem,
    onAddLink: taskActions.addLink,
    onRemoveLink: taskActions.removeLink,
    expandTaskId,
  }

  return (
    <main className="app-shell board-shell">
      <header className="hero">
        <h1>Board</h1>
        <p className="hero-copy">
          Four fixed horizons. Deadlines move tasks forward automatically.
        </p>
      </header>

      <div className="board-entry-layout">
        <TaskForm
          key={`${focusForm}:${prefilledTitle}:${prefilledDeadline}:${prefilledTags}`}
          onAddTask={addTask}
          allTasks={tasks}
          focusOnMount={focusForm}
          initialTitle={prefilledTitle}
          initialDeadline={prefilledDeadline}
          initialTags={prefilledTags}
          initialDetails={prefilledDetails}
          initialReminders={prefilledReminders}
        />
      </div>

      <div className="board-utility-row">
        <div className="board-controls">
          <button
            type="button"
            className={view === 'archived' ? 'board-view-toggle archived' : 'board-view-toggle'}
            onClick={() => setView((current) => (current === 'active' ? 'archived' : 'active'))}
            aria-label={view === 'active' ? 'Show archived tasks' : 'Show active tasks'}
          >
            <ArchiveIcon />
            <span>{view === 'active' ? 'Active' : 'Archived'}</span>
          </button>
          <button
            type="button"
            className={selectionMode ? 'board-select-toggle active' : 'board-select-toggle'}
            onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          >
            {selectionMode ? 'Done' : 'Select'}
          </button>
          <span className="match-count">{visible.length} {visible.length === 1 ? 'task' : 'tasks'}</span>
        </div>
        <BoardToolbar query={filters.query} onChange={(query) => setFilters({ query })} />
      </div>

      {selectionMode && (
        <div className="bulk-bar" role="group" aria-label="Bulk actions">
          <span className="bulk-count">{selectedIds.length} selected</span>
          <button type="button" className="secondary" onClick={() => runBulk(bulkComplete)}>Complete</button>
          <button type="button" className="secondary" onClick={() => runBulk(bulkArchive)}>Archive</button>
          <button type="button" className="secondary danger" onClick={() => runBulk(bulkDelete)}>Delete</button>
        </div>
      )}

      <section className="buckets" aria-label="Task horizons" data-bucket-count={BUCKET_ORDER.length}>
        {BUCKET_ORDER.map((bucket) => (
          <BucketColumn
            key={bucket}
            bucketKey={bucket}
            label={BUCKET_LABELS[bucket]}
            tasks={buckets[bucket]}
            onMoveTask={moveTaskToBucket}
            collapsed={collapsedBuckets.includes(bucket)}
            onToggleCollapse={(bucketKey) =>
              setCollapsedBuckets((current) =>
                current.includes(bucketKey)
                  ? current.filter((entry) => entry !== bucketKey)
                  : [...current, bucketKey],
              )
            }
            selectedIds={selectedIds}
            {...taskHandlers}
          />
        ))}
      </section>

      {undoState && <UndoToast message={undoState.message} onUndo={undo} onDismiss={dismissUndo} />}
    </main>
  )
}
