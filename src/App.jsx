import { useCallback, useEffect, useMemo, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { MenuIcon } from './components/icons'
import { CommandPalette } from './components/CommandPalette'
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog'
import { TaskAddedToast } from './components/TaskAddedToast'
import { ShutdownDialog } from './components/ShutdownDialog'
import { HomePage } from './pages/HomePage'
import { ListPage } from './pages/ListPage'
import { BoardPage } from './pages/BoardPage'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import { useTasks } from './hooks/useTasks'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { useTheme } from './hooks/useTheme'
import { useProfile } from './hooks/useProfile'
import { useShortcuts } from './hooks/useShortcuts'
import { useTemplates } from './hooks/useTemplates'
import { useSavedFilters } from './hooks/useSavedFilters'
import { PlannerPage } from './pages/PlannerPage'
import { DEFAULT_OVERLOAD_HOURS } from './utils/workload'
import { QuickAddModal } from './components/QuickAddModal'
import { toDateStr } from './utils/calendar'
import { WelcomeDialog } from './components/WelcomeDialog'
import { ShortcutDialog } from './components/ShortcutDialog'
import { BUCKET_ORDER } from './utils/buckets'
import { deadlineForBucket } from './utils/buckets'
import { shiftDateStr } from './utils/dates'
import { collectTags } from './utils/tags'

const DELETE_CONFIRM_KEY = 'tidyline:confirm-delete'
const OVERLOAD_HOURS_KEY = 'tidyline:overload-hours'

function loadDeleteConfirmation() {
  return localStorage.getItem(DELETE_CONFIRM_KEY) !== 'false'
}

function loadOverloadHours() {
  const value = Number(localStorage.getItem(OVERLOAD_HOURS_KEY))
  return Number.isFinite(value) && value >= 1 && value <= 24 ? value : DEFAULT_OVERLOAD_HOURS
}

/** The keyboard-focused task is the sole single-task shortcut target. */
function activeTaskId() {
  const focused = document.activeElement?.closest?.('[data-task-id]')
  return focused?.dataset.taskId ?? null
}

function App() {
  const taskState = useTasks()
  const appearance = useTheme()
  const profile = useProfile()
  const templateState = useTemplates()
  const savedFilterState = useSavedFilters()
  const [location, navigate] = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [askBeforeDelete, setAskBeforeDelete] = useState(loadDeleteConfirmation)
  const [pendingDeleteIds, setPendingDeleteIds] = useState([])
  const [taskAdded, setTaskAdded] = useState(null)
  const [overloadHours, setOverloadHours] = useState(loadOverloadHours)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isShutdownOpen, setIsShutdownOpen] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState([])
  const [focusedTaskId, setFocusedTaskId] = useState(null)
  const [isShortcutOpen, setIsShortcutOpen] = useState(false)

  const { completeTask, toggleTask, deleteTask } = taskState

  const createTask = useCallback(
    (taskData) => {
      const task = taskState.addTask(taskData)
      setTaskAdded({ id: task.id, title: task.title })
      return task
    },
    [taskState],
  )

  const dismissTaskAdded = useCallback(() => setTaskAdded(null), [])

  const editAddedTask = useCallback(() => {
    if (!taskAdded) {
      return
    }

    navigate(`/board?expand=${encodeURIComponent(taskAdded.id)}`)
    setTaskAdded(null)
  }, [navigate, taskAdded])

  const handleOpenFullForm = useCallback(
    (parsed) => {
      const params = new URLSearchParams()
      params.set('add', '1')
      if (parsed.title) params.set('title', parsed.title)
      if (parsed.deadline) params.set('deadline', toDateStr(parsed.deadline))
      if (parsed.tags && parsed.tags.length > 0) params.set('tags', parsed.tags.join(', '))
      
      // Phase 2/3 parameters
      if (parsed.startDate) params.set('startDate', toDateStr(parsed.startDate))
      if (parsed.reminderMinutes) params.set('reminderMinutes', String(parsed.reminderMinutes))
      if (parsed.durationMinutes) params.set('durationMinutes', String(parsed.durationMinutes))
      if (parsed.recurrence) params.set('recurrence', JSON.stringify(parsed.recurrence))
      if (parsed.priority) params.set('priority', parsed.priority)
      if (parsed.planForToday) params.set('planForToday', 'true')

      navigate(`/board?${params.toString()}`)
    },
    [navigate],
  )

  useEffect(() => {
    localStorage.setItem(DELETE_CONFIRM_KEY, String(askBeforeDelete))
  }, [askBeforeDelete])

  useEffect(() => {
    localStorage.setItem(OVERLOAD_HOURS_KEY, String(overloadHours))
  }, [overloadHours])

  const requestDelete = useCallback(
    (taskIds) => {
      setTaskAdded(null)
      const ids = Array.isArray(taskIds) ? taskIds : [taskIds]

      if (askBeforeDelete) {
        setPendingDeleteIds(ids)
        return
      }
      if (ids.length === 1) deleteTask(ids[0])
      else taskState.bulkDelete(ids)
    },
    [askBeforeDelete, deleteTask, taskState],
  )

  const cancelDelete = useCallback(() => setPendingDeleteIds([]), [])

  const confirmDelete = useCallback(
    (dontAskAgain) => {
      if (pendingDeleteIds.length === 0) {
        return
      }

      if (dontAskAgain) {
        setAskBeforeDelete(false)
      }

      if (pendingDeleteIds.length === 1) deleteTask(pendingDeleteIds[0])
      else taskState.bulkDelete(pendingDeleteIds)
      setPendingDeleteIds([])
    },
    [deleteTask, pendingDeleteIds, taskState],
  )

  const onNotificationComplete = useCallback(
    (taskId) => completeTask(taskId),
    [completeTask],
  )

  useReminderNotifications(taskState.tasks, { onComplete: onNotificationComplete })

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  const focusSearch = useCallback(() => {
    const input = document.querySelector('.toolbar-search input')

    if (input) {
      input.focus()
      return
    }

    navigate('/board')
    setTimeout(() => document.querySelector('.toolbar-search input')?.focus(), 80)
  }, [navigate])

  const focusTask = useCallback((mode) => {
    const all = [...document.querySelectorAll('[data-task-id]')].filter((element) => element.offsetParent !== null)
    if (all.length === 0) return false
    const current = all.find((element) => element.dataset.taskId === focusedTaskId) ?? all[0]
    let target = current
    if (mode === 'first') target = all[0]
    if (mode === 'last') target = all.at(-1)
    if (mode === 'next' || mode === 'previous') {
      const container = current.closest('[data-bucket-key]')
      const peers = container ? [...container.querySelectorAll('[data-task-id]')] : all
      const index = peers.indexOf(current)
      target = peers[Math.max(0, Math.min(peers.length - 1, index + (mode === 'next' ? 1 : -1)))] ?? current
    }
    if (mode === 'left' || mode === 'right') {
      const column = current.closest('[data-bucket-key]')
      const columns = [...document.querySelectorAll('[data-bucket-key]')]
      const columnIndex = columns.indexOf(column)
      const nextColumn = columns[columnIndex + (mode === 'right' ? 1 : -1)]
      const peers = nextColumn ? [...nextColumn.querySelectorAll('[data-task-id]')] : []
      target = peers[0] ?? current
    }
    setFocusedTaskId(target.dataset.taskId)
    target.focus()
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    return true
  }, [focusedTaskId])

  const focusedId = useCallback(() => focusedTaskId ?? activeTaskId(), [focusedTaskId])

  const commandTargetIds = useMemo(() => {
    if (selectedTaskIds.length > 0) return selectedTaskIds
    return focusedTaskId && taskState.tasks.some((task) => task.id === focusedTaskId) ? [focusedTaskId] : []
  }, [focusedTaskId, selectedTaskIds, taskState.tasks])
  const commandTargetLabel = commandTargetIds.length > 1
    ? `${commandTargetIds.length} selected`
    : taskState.tasks.find((task) => task.id === commandTargetIds[0])?.title ?? ''


  const commands = useMemo(
    () => {
      const targetMissing = commandTargetIds.length === 0
      const targets = taskState.tasks.filter((task) => commandTargetIds.includes(task.id))
      const targetCommand = (command) => ({ ...command, section: 'Actions', disabled: targetMissing, disabledReason: targetMissing ? 'Focus or select a task first' : '' })
      const rescheduleBy = (days) => taskState.rescheduleTasks(targets.filter((task) => task.deadline).map((task) => ({ id: task.id, deadline: shiftDateStr(task.deadline, days) })), 'command')
      const moveTo = (bucket) => taskState.rescheduleTasks(targets.map((task) => ({ id: task.id, deadline: deadlineForBucket(bucket) })), 'command')
      return [
      { id: 'complete', label: targets.length === 1 && targets[0]?.done ? 'Reopen task' : 'Complete', ...targetCommand({}), run: () => targets.length === 1 ? taskState.toggleTask(targets[0].id) : taskState.bulkComplete(commandTargetIds) },
      targetCommand({ id: 'plan-today', label: 'Plan for today', run: () => commandTargetIds.forEach(taskState.togglePlanForToday) }),
      targetCommand({ id: 'tomorrow', label: 'Push to tomorrow', run: () => rescheduleBy(1) }),
      targetCommand({ id: 'next-week', label: 'Push to next week', run: () => rescheduleBy(7) }),
      ...BUCKET_ORDER.map((bucket) => targetCommand({ id: `move-${bucket}`, label: `Move to ${bucket === 'today' ? 'Today' : bucket[0].toUpperCase() + bucket.slice(1)}`, run: () => moveTo(bucket) })),
      ...['high', 'medium', 'low'].map((priority) => targetCommand({ id: `priority-${priority}`, label: `Set priority: ${priority[0].toUpperCase() + priority.slice(1)}`, run: () => commandTargetIds.forEach((id) => taskState.updateTask(id, { priority })) })),
      targetCommand({ id: 'priority-none', label: 'Set priority: None', run: () => commandTargetIds.forEach((id) => taskState.updateTask(id, { priority: null })) }),
      targetCommand({ id: 'pin', label: targets.length === 1 && targets[0]?.pinned ? 'Unpin' : 'Pin', run: () => commandTargetIds.forEach(taskState.togglePin) }),
      targetCommand({ id: 'archive-task', label: 'Archive', run: () => taskState.bulkArchive(commandTargetIds) }),
      targetCommand({ id: 'delete-task', label: 'Delete', run: () => requestDelete(commandTargetIds) }),
      targetCommand({ id: 'duplicate', label: 'Duplicate', run: () => commandTargetIds.forEach(taskState.duplicateTask) }),
      targetCommand({ id: 'add-tag', label: 'Add tag…', acceptsValue: true, suggestions: collectTags(taskState.tasks), runWithValue: (tag) => commandTargetIds.forEach((id) => { const task = taskState.tasks.find((entry) => entry.id === id); if (task && tag.trim()) taskState.updateTask(id, { tags: [...new Set([...(task.tags ?? []), tag.trim()])] }) }) }),
      { id: 'undo', label: 'Undo last action', hint: 'U', section: 'Actions', disabled: !taskState.undoState, disabledReason: 'Nothing to undo', run: taskState.undo },
      { id: 'clear-completed', label: 'Clear completed', section: 'Actions', run: taskState.clearCompleted },
      { id: 'new', label: 'Create task', hint: 'N/Q', section: 'Navigate', run: () => setIsQuickAddOpen(true) },
      { id: 'search', label: 'Focus search', hint: '/', section: 'Navigate', run: focusSearch },
      { id: 'home', label: 'Go to Home', section: 'Navigate', run: () => navigate('/') },
      { id: 'board', label: 'Go to Board', section: 'Navigate', run: () => navigate('/board') },
      { id: 'list', label: 'Go to All tasks', section: 'Navigate', run: () => navigate('/list') },
      { id: 'calendar', label: 'Go to Calendar', section: 'Navigate', run: () => navigate('/calendar') },
      { id: 'planner', label: 'Go to Day planner', section: 'Navigate', run: () => navigate('/planner') },
      { id: 'settings', label: 'Go to Settings', section: 'Navigate', run: () => navigate('/settings') },
      { id: 'archive', label: 'Show archived tasks', section: 'View', run: () => navigate('/board?view=archived') },
      {
        id: 'theme',
        label: `Switch to ${appearance.theme === 'dark' ? 'light' : 'dark'} theme`,
        section: 'View',
        run: appearance.toggleTheme,
      },
      {
        id: 'density',
        label: `Use ${appearance.density === 'compact' ? 'comfortable' : 'compact'} density`,
        section: 'View',
        run: () =>
          appearance.setDensity(appearance.density === 'compact' ? 'comfortable' : 'compact'),
      }]
    },
    [navigate, focusSearch, appearance, commandTargetIds, requestDelete, taskState],
  )

  useShortcuts(
    useMemo(
      () => ({
        onPalette: () => setIsPaletteOpen((open) => !open),
        onEscape: () => {
          setIsPaletteOpen(false)
          setIsQuickAddOpen(false)
          setIsShortcutOpen(false)
        },
        onQuickAdd: () => setIsQuickAddOpen(true),
        onFocusSearch: focusSearch,
        onToggleActive: () => {
          const id = focusedId()
          if (!id) return false
          toggleTask(id)
          return true
        },
        onDeleteActive: () => {
          const id = focusedId()
          if (!id) return false
          requestDelete(id)
          return true
        },
        onNextTask: () => focusTask('next'),
        onPreviousTask: () => focusTask('previous'),
        onPreviousBucket: () => focusTask('left'),
        onNextBucket: () => focusTask('right'),
        onFirstTask: () => focusTask('first'),
        onLastTask: () => focusTask('last'),
        onEditActive: () => { const id = focusedId(); if (!id) return false; navigate(`/board?expand=${encodeURIComponent(id)}`); return true },
        onSelectActive: () => { const id = focusedId(); if (!id) return false; setSelectedTaskIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]); return true },
        onPlanActive: () => { const id = focusedId(); if (!id) return false; taskState.togglePlanForToday(id); return true },
        onPinActive: () => { const id = focusedId(); if (!id) return false; taskState.togglePin(id); return true },
        onArchiveActive: () => { const id = focusedId(); if (!id) return false; taskState.archiveTask(id); return true },
        onMoveActive: (key) => { const id = focusedId(); const bucket = BUCKET_ORDER[Number(key) - 1]; if (!id || !bucket) return false; taskState.moveTaskToBucket(id, bucket); return true },
        onUndo: () => { taskState.undo(); return true },
        onHelp: () => { setIsShortcutOpen(true); return true },
      }),
      [focusSearch, toggleTask, requestDelete, focusedId, focusTask, navigate, taskState],
    ),
  )

  if (!profile.isSetUp) {
    return (
      <WelcomeDialog
        accent={appearance.accent}
        onAccentChange={appearance.setAccent}
        onImportTasks={taskState.importTasks}
        onComplete={profile.completeSetup}
        dataError={taskState.dataError}
      />
    )
  }

  return (
    <div className={isCollapsed ? 'app-layout collapsed' : 'app-layout'}>
      {taskState.dataError && <div className="data-version-banner" role="alert">{taskState.dataError}</div>}
      <header className="topbar">
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isDrawerOpen}
          aria-controls="sidebar-nav"
        >
          <MenuIcon />
        </button>
        <span className="topbar-title">{profile.name}</span>
      </header>

      <Sidebar
        isOpen={isDrawerOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
        onNavigate={() => setIsDrawerOpen(false)}
        onOpenPalette={() => {
          setIsDrawerOpen(false)
          setIsPaletteOpen(true)
        }}
        onOpenShutdown={() => {
          setIsDrawerOpen(false)
          setIsShutdownOpen(true)
        }}
        workspaceName={profile.name}
        tasks={taskState.tasks}
        onOpenTask={(taskId) => {
          setIsDrawerOpen(false)
          navigate(`/board?expand=${encodeURIComponent(taskId)}`)
        }}
      />

      {isDrawerOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div className="app-content">
        <div className="route-view" key={location}>
          <Switch>
            <Route path="/">
              <HomePage
                tasks={taskState.tasks}
                workspaceName={profile.name}
                toggleTask={taskState.toggleTask}
                rescheduleTasks={taskState.rescheduleTasks}
                overloadHours={overloadHours}
                onOpenTask={(taskId) => navigate(`/board?expand=${encodeURIComponent(taskId)}`)}
              />
            </Route>
            <Route path="/board">
              <BoardPage
                {...taskState}
                addTask={createTask}
                deleteTask={requestDelete}
                templates={templateState.templates}
                onSaveTemplate={templateState.saveTaskTemplate}
                savedFilters={savedFilterState.savedFilters}
                onSaveFilter={savedFilterState.saveFilter}
                onDeleteFilter={savedFilterState.deleteFilter}
                selectedIds={selectedTaskIds}
                onSelectedIdsChange={setSelectedTaskIds}
                focusedTaskId={focusedTaskId}
                onFocusedTaskChange={setFocusedTaskId}
              />
            </Route>
            <Route path="/list">
              <ListPage
                tasks={taskState.tasks}
                toggleTask={taskState.toggleTask}
                updateTask={taskState.updateTask}
                selectedIds={selectedTaskIds}
                onSelectedIdsChange={setSelectedTaskIds}
                focusedTaskId={focusedTaskId}
                onFocusedTaskChange={setFocusedTaskId}
                onOpenTask={(taskId) => navigate(`/board?expand=${encodeURIComponent(taskId)}`)}
                savedFilters={savedFilterState.savedFilters}
                onSaveFilter={savedFilterState.saveFilter}
                onDeleteFilter={savedFilterState.deleteFilter}
              />
            </Route>
            <Route path="/calendar">
              <CalendarPage
                tasks={taskState.tasks}
                addTask={createTask}
                setDeadline={taskState.setDeadline}
                templates={templateState.templates}
                overloadHours={overloadHours}
              />
            </Route>
            <Route path="/planner">
              <PlannerPage
                tasks={taskState.tasks}
                setScheduledStart={taskState.setScheduledStart}
                updateTask={taskState.updateTask}
              />
            </Route>
            <Route path="/settings">
              <SettingsPage
                tasks={taskState.tasks}
                appearance={appearance}
                importTasks={taskState.importTasks}
                clearCompleted={taskState.clearCompleted}
                askBeforeDelete={askBeforeDelete}
                onAskBeforeDeleteChange={setAskBeforeDelete}
                templates={templateState.templates}
                onRenameTemplate={templateState.renameTemplate}
                onDeleteTemplate={templateState.deleteTemplate}
                overloadHours={overloadHours}
                onOverloadHoursChange={setOverloadHours}
                profile={profile}
              />
            </Route>
          </Switch>
        </div>
      </div>

      {isPaletteOpen && (
        <CommandPalette commands={commands} targetLabel={commandTargetLabel} onClose={() => setIsPaletteOpen(false)} />
      )}

      {isQuickAddOpen && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onAddTask={createTask}
          onOpenFullForm={handleOpenFullForm}
          tasks={taskState.tasks}
        />
      )}

      {pendingDeleteIds.length > 0 && (
        <DeleteConfirmDialog
          taskTitle={pendingDeleteIds.length === 1 ? (taskState.tasks.find((task) => task.id === pendingDeleteIds[0])?.title ?? 'This task') : `${pendingDeleteIds.length} tasks`}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}

      {taskAdded && (
        <TaskAddedToast
          key={taskAdded.id}
          title={taskAdded.title}
          onEdit={editAddedTask}
          onDismiss={dismissTaskAdded}
        />
      )}

      {isShutdownOpen && (
        <ShutdownDialog
          tasks={taskState.tasks}
          setDeadline={taskState.setDeadline}
          archiveTask={taskState.archiveTask}
          onClose={() => setIsShutdownOpen(false)}
        />
      )}
      {isShortcutOpen && <ShortcutDialog onClose={() => setIsShortcutOpen(false)} />}
    </div>
  )
}

export default App
