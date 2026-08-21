import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from 'wouter'
import { BUCKET_LABELS, BUCKET_ORDER, deadlineForBucket, groupTasksByBucket } from '../utils/buckets'
import { toDateStr } from '../utils/calendar'
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
import { ArchiveIcon } from '../components/icons'
import { TaskCard } from '../components/TaskCard'
import { shiftDateStr } from '../utils/dates'
import { SelectMenu } from '../components/SelectMenu'

export function BoardPage({
  tasks,
  addTask,
  moveTaskToBucket,
  bulkComplete,
  bulkArchive,
  bulkDelete,
  rescheduleTasks,
  undoState,
  undo,
  dismissUndo,
  templates = [],
  onSaveTemplate = () => null,
  savedFilters = [],
  onSaveFilter = () => null,
  onDeleteFilter = () => {},
  selectedIds = [],
  onSelectedIdsChange = () => {},
  focusedTaskId = null,
  onFocusedTaskChange = () => {},
  ...taskActions
}) {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const focusForm = params.get('add') === '1'
  const expandTaskId = params.get('expand')

  const prefilledTitle = params.get('title') || ''
  const prefilledDeadline = params.get('deadline') || ''
  const prefilledTags = params.get('tags') || ''

  const prefilledDetails = useMemo(() => {
    const localParams = new URLSearchParams(search)
    const details = {}
    const startDate = localParams.get('startDate')
    if (startDate) details.startDate = startDate

    const durationMinutes = localParams.get('durationMinutes')
    if (durationMinutes) {
      details.durationValue = durationMinutes
      details.durationUnit = 'min'
    }

    const recurrence = localParams.get('recurrence')
    if (recurrence) {
      try {
        details.recurrence = JSON.parse(recurrence)
      } catch (error) {
        console.warn('Invalid recurrence format:', error)
      }
    }

    const priority = localParams.get('priority')
    if (priority) details.priority = priority

    const planForToday = localParams.get('planForToday')
    if (planForToday === 'true') {
      details.plannedDate = toDateStr(new Date())
    }

    return Object.keys(details).length > 0 ? details : null
  }, [search])

  const prefilledReminders = useMemo(() => {
    const localParams = new URLSearchParams(search)
    const minutes = localParams.get('reminderMinutes')
    if (minutes) {
      return [{ kind: 'relative', minutesBefore: Number(minutes) }]
    }
    return null
  }, [search])

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
  const [collapsedBuckets, setCollapsedBuckets] = useState([])
  const [isTodayCompact, setIsTodayCompact] = useState(false)
  const [isNoDateOpen, setIsNoDateOpen] = useState(false)
  const [noDateTitle, setNoDateTitle] = useState('')
  const [bulkDate, setBulkDate] = useState('')

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

  useEffect(() => {
    if (visible[0] && !visible.some((task) => task.id === focusedTaskId)) onFocusedTaskChange(visible[0].id)
  }, [focusedTaskId, onFocusedTaskChange, visible])

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
      groupTasksByBucket(bucketed, now, buildComparator(filters), {
        includeUpcoming: view === 'archived',
      }),
    [bucketed, filters, now, view],
  )

  useFlipReparent(boardRef, tick)

  function toggleSelected(id) {
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id],
    )
  }

  function exitSelection() {
    setSelectionMode(false)
    onSelectedIdsChange([])
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
    focusedTaskId,
    onTaskFocus: onFocusedTaskChange,
  }

  function bulkShift(days) {
    const selected = tasks.filter((task) => selectedIds.includes(task.id) && task.deadline)
    if (!selected.length) return
    rescheduleTasks(selected.map((task) => ({ id: task.id, deadline: shiftDateStr(task.deadline, days) })), 'board-bulk')
    exitSelection()
  }

  function bulkMoveTo(value) {
    if (!value) return
    rescheduleTasks(selectedIds.map((id) => ({ id, deadline: deadlineForBucket(value) })), 'board-bulk')
    exitSelection()
  }

  function moveToVisibleBucket(taskId, bucketKey) {
    moveTaskToBucket(taskId, bucketKey)
  }

  return (
    <main className="app-shell board-shell">
      <header className="hero">
        <h1>Board</h1>
        <p className="hero-copy">
          Add a task, set its due date, attach one or more reminders, and it
          lands automatically in the right time bucket.
        </p>
      </header>

      <div className="board-entry-layout">
        <TaskForm
          key={`${focusForm}:${prefilledTitle}:${prefilledDeadline}:${prefilledTags}`}
          onAddTask={addTask}
          allTasks={tasks}
          focusOnMount={focusForm}
          templates={templates}
          initialTitle={prefilledTitle}
          initialDeadline={prefilledDeadline}
          initialTags={prefilledTags}
          initialDetails={prefilledDetails}
          initialReminders={prefilledReminders}
        />

        <button type="button" className="board-someday-prompt" aria-labelledby="board-someday-prompt-title" onClick={() => document.querySelector('.board-nodate-add input')?.focus()}>
          <span className="board-someday-prompt-kicker">No deadline yet?</span>
          <h2 id="board-someday-prompt-title">Give the idea some room.</h2>
          <p>
            Not sure when to have it done? Keep it in Someday / Maybe until the right
            date becomes clear.
          </p>
          <span className="board-someday-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      <div className="board-utility-row">
        <div className="board-controls">
          <button
            type="button"
            className={view === 'archived' ? 'board-view-toggle archived' : 'board-view-toggle'}
            onClick={() => setView((current) => (current === 'active' ? 'archived' : 'active'))}
            aria-label={view === 'active' ? 'Show archived tasks' : 'Show active tasks'}
            title={view === 'active' ? 'Show archived tasks' : 'Show active tasks'}
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
          <span className="match-count">
            {visible.length} {visible.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        <SavedFilterBar
          savedFilters={savedFilters}
          onApply={setFilters}
          onSave={(name) => onSaveFilter(name, filters)}
          onDelete={onDeleteFilter}
        />

        <BoardToolbar filters={filters} onChange={setFilters} tags={tags} />
      </div>

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
          <button type="button" className="secondary" onClick={() => bulkShift(-1)}>−1 day</button>
          <button type="button" className="secondary" onClick={() => bulkShift(1)}>+1 day</button>
          <button type="button" className="secondary" onClick={() => bulkShift(-7)}>−1 week</button>
          <button type="button" className="secondary" onClick={() => bulkShift(7)}>+1 week</button>
          <label className="bulk-date"><span>Set date</span><input type="date" value={bulkDate} onChange={(event) => setBulkDate(event.target.value)} /></label>
          <button type="button" className="secondary" disabled={!bulkDate} onClick={() => { rescheduleTasks(selectedIds.map((id) => ({ id, deadline: bulkDate })), 'board-bulk'); exitSelection() }}>Apply date</button>
          <SelectMenu value="" ariaLabel="Move selected tasks to bucket" options={[{ value: '', label: 'Move to bucket' }, ...BUCKET_ORDER.map((key) => ({ value: key, label: BUCKET_LABELS[key] }))]} onChange={bulkMoveTo} />
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
          data-bucket-count={BUCKET_ORDER.length}
        >
          {BUCKET_ORDER.map((bucket) => (
            <BucketColumn
              key={bucket}
              bucketKey={bucket}
              label={BUCKET_LABELS[bucket]}
              tasks={buckets[bucket]}
              onMoveTask={moveToVisibleBucket}
              collapsed={collapsedBuckets.includes(bucket)}
              onToggleCollapse={toggleBucketCollapse}
              compact={bucket === 'today' && isTodayCompact}
              selectedIds={selectedIds}
              {...taskHandlers}
            />
          ))}
        </section>

        <section className="board-nodate" aria-labelledby="board-nodate-title">
          <button type="button" className="board-nodate-toggle" onClick={() => setIsNoDateOpen((open) => !open)} aria-expanded={isNoDateOpen}>
            <span><strong id="board-nodate-title">No date</strong><small>{buckets.nodate.length} undated</small></span>
            <span aria-hidden="true">{isNoDateOpen ? '−' : '+'}</span>
          </button>
          {isNoDateOpen && (
            <div className="board-nodate-content">
              <form className="board-nodate-add" onSubmit={(event) => { event.preventDefault(); if (!noDateTitle.trim()) return; taskActions.addSomedayTask({ title: noDateTitle.trim() }); setNoDateTitle('') }}>
                <input value={noDateTitle} onChange={(event) => setNoDateTitle(event.target.value)} placeholder="Capture an undated task" aria-label="Undated task title" />
                <button type="submit" className="secondary">Add without date</button>
              </form>
              {buckets.nodate.length === 0 ? <p className="empty">No undated tasks.</p> : (
                <ul className="board-nodate-list">
                  {buckets.nodate.map((task) => <TaskCard key={task.id} task={task} selected={selectedIds.includes(task.id)} focused={task.id === focusedTaskId} onPromote={taskActions.promoteSomeday} {...taskHandlers} />)}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      {undoState && (
        <UndoToast message={undoState.message} onUndo={undo} onDismiss={dismissUndo} />
      )}
    </main>
  )
}
