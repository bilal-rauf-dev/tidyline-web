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
import { UpcomingSection } from '../components/UpcomingSection'
import { isTaskUpcoming } from '../utils/taskFields'
import { SavedFilterBar } from '../components/SavedFilterBar'

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
  bucketOrder = BUCKET_ORDER,
  templates = [],
  onSaveTemplate = () => null,
  savedFilters = [],
  onSaveFilter = () => null,
  onDeleteFilter = () => {},
  ...taskActions
}) {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const focusForm = params.get('add') === '1'
  const expandTaskId = params.get('expand')

  const boardRef = useRef(null)
  const todayCollapseMarkerRef = useRef(null)
  const todayExpandMarkerRef = useRef(null)
  const todayCompactRef = useRef(false)
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
    function updateCompact(nextCompact) {
      if (nextCompact === todayCompactRef.current) {
        return
      }

      todayCompactRef.current = nextCompact
      setIsTodayCompact(nextCompact)
    }

    const collapseMarker = todayCollapseMarkerRef.current
    const expandMarker = todayExpandMarkerRef.current

    if (!collapseMarker || !expandMarker) {
      return undefined
    }

    if (typeof IntersectionObserver === 'undefined') {
      function syncFallback() {
        const collapseTop = collapseMarker.getBoundingClientRect().top
        const expandTop = expandMarker.getBoundingClientRect().top

        if (!todayCompactRef.current && collapseTop <= 0) {
          updateCompact(true)
        } else if (todayCompactRef.current && expandTop >= 0) {
          updateCompact(false)
        }
      }

      syncFallback()
      window.addEventListener('scroll', syncFallback, { passive: true })
      window.addEventListener('resize', syncFallback)
      return () => {
        window.removeEventListener('scroll', syncFallback)
        window.removeEventListener('resize', syncFallback)
      }
    }

    const collapseObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
        updateCompact(true)
      }
    })
    const expandObserver = new IntersectionObserver(([entry]) => {
      // Also expand after a large upward scroll that skips the 1px marker's
      // intersecting state entirely and lands with it below the viewport top.
      if (entry.isIntersecting || entry.boundingClientRect.top >= 0) {
        updateCompact(false)
      }
    })

    collapseObserver.observe(collapseMarker)
    expandObserver.observe(expandMarker)

    return () => {
      collapseObserver.disconnect()
      expandObserver.disconnect()
    }
  }, [])

  const tags = useMemo(() => collectTags(tasks), [tasks])

  const visible = useMemo(() => {
    const inView = tasks.filter(
      (task) => task.deadline && (view === 'archived' ? task.archived : !task.archived),
    )
    return filterTasks(inView, filters)
  }, [tasks, view, filters])

  // Overdue work is lifted out of the buckets entirely (section D).
  const overdueGroups = useMemo(
    () => (view === 'archived' ? [] : groupOverdue(visible, now)),
    [visible, view, now],
  )

  const upcomingTasks = useMemo(
    () =>
      view === 'archived'
        ? []
        : visible
            .filter((task) => isTaskUpcoming(task, now))
            .sort((a, b) =>
              a.startDate.localeCompare(b.startDate) || a.deadline.localeCompare(b.deadline),
            ),
    [visible, view, now],
  )

  const bucketed = useMemo(
    () =>
      visible.filter(
        (task) =>
          view === 'archived' || (!isTaskUpcoming(task, now) && !isOverdue(task, now)),
      ),
    [visible, view, now],
  )

  const buckets = useMemo(
    () =>
      groupTasksByBucket(bucketed, now, buildComparator(filters), bucketOrder, {
        includeUpcoming: view === 'archived',
      }),
    [bucketed, filters, now, bucketOrder, view],
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
    onTogglePlan: taskActions.togglePlanForToday,
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
    onSaveTemplate,
    expandTaskId,
  }

  function moveToVisibleBucket(taskId, bucketKey) {
    moveTaskToBucket(taskId, bucketKey, bucketOrder)
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

      <TaskForm
        onAddTask={addTask}
        allTasks={tasks}
        focusOnMount={focusForm}
        templates={templates}
      />

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

      <SavedFilterBar
        savedFilters={savedFilters}
        onApply={setFilters}
        onSave={(name) => onSaveFilter(name, filters)}
        onDelete={onDeleteFilter}
      />

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
        <UpcomingSection
          tasks={upcomingTasks}
          selectedIds={selectedIds}
          {...taskHandlers}
        />

        <OverdueSection groups={overdueGroups} selectedIds={selectedIds} {...taskHandlers} />

        <span className="today-sticky-sentinel" aria-hidden="true">
          <span ref={todayExpandMarkerRef} className="today-expand-marker" />
          <span ref={todayCollapseMarkerRef} className="today-collapse-marker" />
        </span>

        <section
          className="buckets"
          aria-label="Task buckets"
          data-bucket-count={bucketOrder.length}
        >
          {bucketOrder.map((bucket) => (
            <BucketColumn
              key={bucket}
              bucketKey={bucket}
              label={BUCKET_LABELS[bucket]}
              tasks={buckets[bucket]}
              onMoveTask={moveToVisibleBucket}
              bucketOrder={bucketOrder}
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
