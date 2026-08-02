import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from 'wouter'
import { BUCKET_LABELS, BUCKET_ORDER, groupTasksByBucket } from '../utils/buckets'
import { DEFAULT_FILTERS, buildComparator, filterTasks } from '../utils/filters'
import { collectTags } from '../utils/tags'
import { groupOverdue, isOverdue } from '../utils/overdue'
import { useFlipReparent, useTimeTick } from '../hooks/useFlipReparent'
import { TaskForm } from '../components/TaskForm'
import { BucketColumn } from '../components/BucketColumn'
import { BoardToolbar } from '../components/BoardToolbar'
import { OverdueSection } from '../components/OverdueSection'
import { UndoToast } from '../components/UndoToast'

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

  const boardRef = useRef(null)
  const todaySentinelRef = useRef(null)
  const tick = useTimeTick()
  // `now` is derived purely from the tick, so every time-sensitive memo below
  // has an honest dependency instead of a suppressed lint warning.
  const now = useMemo(() => new Date(tick), [tick])

  const [view, setView] = useState(params.get('view') === 'archived' ? 'archived' : 'active')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [collapsedBuckets, setCollapsedBuckets] = useState([])
  const [isTodayCompact, setIsTodayCompact] = useState(false)

  useEffect(() => {
    function syncTodaySummary() {
      const sentinelTop = todaySentinelRef.current?.getBoundingClientRect().top

      if (sentinelTop === undefined) {
        return
      }

      // The Today card becomes sticky at 0.75rem (12px). Compact only after
      // its original position has travelled another ~52px past that point.
      setIsTodayCompact(sentinelTop <= -40)
    }

    syncTodaySummary()
    window.addEventListener('scroll', syncTodaySummary, { passive: true })
    window.addEventListener('resize', syncTodaySummary)
    return () => {
      window.removeEventListener('scroll', syncTodaySummary)
      window.removeEventListener('resize', syncTodaySummary)
    }
  }, [])

  const tags = useMemo(() => collectTags(tasks), [tasks])

  const visible = useMemo(() => {
    const inView = tasks.filter((task) =>
      view === 'archived' ? task.archived : !task.archived,
    )
    return filterTasks(inView, filters)
  }, [tasks, view, filters])

  // Overdue work is lifted out of the buckets entirely (section D).
  const overdueGroups = useMemo(
    () => (view === 'archived' ? [] : groupOverdue(visible, now)),
    [visible, view, now],
  )

  const bucketed = useMemo(
    () => visible.filter((task) => view === 'archived' || !isOverdue(task, now)),
    [visible, view, now],
  )

  const buckets = useMemo(
    () => groupTasksByBucket(bucketed, now, buildComparator(filters)),
    [bucketed, filters, now],
  )

  useFlipReparent(boardRef, tick)

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

  function toggleBucketCollapse(bucketKey) {
    setCollapsedBuckets((current) =>
      current.includes(bucketKey)
        ? current.filter((entry) => entry !== bucketKey)
        : [...current, bucketKey],
    )
  }

  // Explicit mapping: TaskCard/TaskDetails use on*-prefixed prop names, which
  // do not match the hook's action names.
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
    onAddAttachment: taskActions.addAttachment,
    onRemoveAttachment: taskActions.removeAttachment,
    expandTaskId,
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
          {visible.length} {visible.length === 1 ? 'task' : 'tasks'}
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

      <div ref={boardRef}>
        <OverdueSection groups={overdueGroups} selectedIds={selectedIds} {...taskHandlers} />

        <span ref={todaySentinelRef} className="today-sticky-sentinel" aria-hidden="true" />

        <section className="buckets" aria-label="Task buckets">
          {BUCKET_ORDER.map((bucket) => (
            <BucketColumn
              key={bucket}
              bucketKey={bucket}
              label={BUCKET_LABELS[bucket]}
              tasks={buckets[bucket]}
              onMoveTask={moveTaskToBucket}
              collapsed={collapsedBuckets.includes(bucket)}
              onToggleCollapse={toggleBucketCollapse}
              compact={bucket === 'today' && isTodayCompact}
              selectedIds={selectedIds}
              {...taskHandlers}
            />
          ))}
        </section>
      </div>

      {undoState && (
        <UndoToast message={undoState.message} onUndo={undo} onDismiss={dismissUndo} />
      )}
    </main>
  )
}
