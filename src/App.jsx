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
import { BoardPage } from './pages/BoardPage'
import { CalendarPage } from './pages/CalendarPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useTasks } from './hooks/useTasks'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { useTheme } from './hooks/useTheme'
import { useProfile } from './hooks/useProfile'
import { useBucketConfig } from './hooks/useBucketConfig'
import { useShortcuts } from './hooks/useShortcuts'
import { useTemplates } from './hooks/useTemplates'
import { useSavedFilters } from './hooks/useSavedFilters'
import { useAuth } from './hooks/useAuth'
import { PlannerPage } from './pages/PlannerPage'
import { SomedayPage } from './pages/SomedayPage'
import { DEFAULT_OVERLOAD_HOURS } from './utils/workload'
import { QuickAddModal } from './components/QuickAddModal'
import { toDateStr } from './utils/calendar'
import { WelcomeDialog } from './components/WelcomeDialog'

const DELETE_CONFIRM_KEY = 'tidyline:confirm-delete'
const OVERLOAD_HOURS_KEY = 'tidyline:overload-hours'

function loadDeleteConfirmation() {
  return localStorage.getItem(DELETE_CONFIRM_KEY) !== 'false'
}

function loadOverloadHours() {
  const value = Number(localStorage.getItem(OVERLOAD_HOURS_KEY))
  return Number.isFinite(value) && value >= 1 && value <= 24 ? value : DEFAULT_OVERLOAD_HOURS
}

/** The task under the caret or the pointer — what single-key actions act on. */
function activeTaskId() {
  const focused = document.activeElement?.closest?.('[data-task-id]')

  if (focused) {
    return focused.dataset.taskId
  }

  return document.querySelector('[data-task-id]:hover')?.dataset.taskId ?? null
}

function App() {
  const taskState = useTasks()
  const appearance = useTheme()
  const profile = useProfile()
  const auth = useAuth()
  const bucketConfig = useBucketConfig()
  const templateState = useTemplates()
  const savedFilterState = useSavedFilters()
  const [location, navigate] = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [askBeforeDelete, setAskBeforeDelete] = useState(loadDeleteConfirmation)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [taskAdded, setTaskAdded] = useState(null)
  const [overloadHours, setOverloadHours] = useState(loadOverloadHours)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isShutdownOpen, setIsShutdownOpen] = useState(false)

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
      if (parsed.energy) params.set('energy', parsed.energy)
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
    (taskId) => {
      setTaskAdded(null)

      if (askBeforeDelete) {
        setPendingDeleteId(taskId)
        return
      }

      deleteTask(taskId)
    },
    [askBeforeDelete, deleteTask],
  )

  const cancelDelete = useCallback(() => setPendingDeleteId(null), [])

  const confirmDelete = useCallback(
    (dontAskAgain) => {
      if (!pendingDeleteId) {
        return
      }

      if (dontAskAgain) {
        setAskBeforeDelete(false)
      }

      deleteTask(pendingDeleteId)
      setPendingDeleteId(null)
    },
    [deleteTask, pendingDeleteId],
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


  const commands = useMemo(
    () => [
      { id: 'new', label: 'Create task', hint: 'N/Q', run: () => setIsQuickAddOpen(true) },
      { id: 'search', label: 'Focus search', hint: '/', run: focusSearch },
      { id: 'home', label: 'Go to Home', run: () => navigate('/') },
      { id: 'board', label: 'Go to Board', run: () => navigate('/board') },
      { id: 'calendar', label: 'Go to Calendar', run: () => navigate('/calendar') },
      { id: 'planner', label: 'Go to Day planner', run: () => navigate('/planner') },
      { id: 'someday', label: 'Go to Someday / Maybe', run: () => navigate('/someday') },
      { id: 'analytics', label: 'Go to Analytics', run: () => navigate('/analytics') },
      { id: 'settings', label: 'Go to Settings', run: () => navigate('/settings') },
      { id: 'archive', label: 'Show archived tasks', run: () => navigate('/board?view=archived') },
      {
        id: 'theme',
        label: `Switch to ${appearance.theme === 'dark' ? 'light' : 'dark'} theme`,
        run: appearance.toggleTheme,
      },
      {
        id: 'density',
        label: `Use ${appearance.density === 'compact' ? 'comfortable' : 'compact'} density`,
        run: () =>
          appearance.setDensity(appearance.density === 'compact' ? 'comfortable' : 'compact'),
      },
    ],
    [navigate, focusSearch, appearance],
  )

  useShortcuts(
    useMemo(
      () => ({
        onPalette: () => setIsPaletteOpen((open) => !open),
        onEscape: () => {
          setIsPaletteOpen(false)
          setIsQuickAddOpen(false)
        },
        onQuickAdd: () => setIsQuickAddOpen(true),
        onFocusSearch: focusSearch,
        onToggleActive: () => {
          const id = activeTaskId()
          if (!id) return false
          toggleTask(id)
          return true
        },
        onDeleteActive: () => {
          const id = activeTaskId()
          if (!id) return false
          requestDelete(id)
          return true
        },
      }),
      [focusSearch, toggleTask, requestDelete],
    ),
  )

  useEffect(() => {
    if (auth.isAuthenticated && !profile.isSetUp && auth.displayName) {
      profile.completeSetup(auth.displayName)
    }
  }, [auth.isAuthenticated, auth.displayName, profile])

  if (!profile.isSetUp && !auth.isAuthenticated) {
    return (
      <WelcomeDialog
        onImportTasks={taskState.importTasks}
        onComplete={profile.completeSetup}
        onGoogleSignIn={auth.signInWithGoogle}
      />
    )
  }

  return (
    <div className={isCollapsed ? 'app-layout collapsed' : 'app-layout'}>
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
                auth={auth}
              />
            </Route>
            <Route path="/board">
              <BoardPage
                {...taskState}
                addTask={createTask}
                deleteTask={requestDelete}
                bucketOrder={bucketConfig.bucketOrder}
                templates={templateState.templates}
                onSaveTemplate={templateState.saveTaskTemplate}
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
            <Route path="/someday">
              <SomedayPage
                {...taskState}
                deleteTask={requestDelete}
              />
            </Route>
            <Route path="/analytics">
              <AnalyticsPage tasks={taskState.tasks} bucketOrder={bucketConfig.bucketOrder} />
            </Route>
            <Route path="/settings">
              <SettingsPage
                tasks={taskState.tasks}
                appearance={appearance}
                importTasks={taskState.importTasks}
                clearCompleted={taskState.clearCompleted}
                askBeforeDelete={askBeforeDelete}
                onAskBeforeDeleteChange={setAskBeforeDelete}
                bucketOrder={bucketConfig.bucketOrder}
                onToggleBucket={bucketConfig.toggleBucket}
                onResetBuckets={bucketConfig.resetBuckets}
                templates={templateState.templates}
                onRenameTemplate={templateState.renameTemplate}
                onDeleteTemplate={templateState.deleteTemplate}
                overloadHours={overloadHours}
                onOverloadHoursChange={setOverloadHours}
                profile={profile}
                auth={auth}
              />
            </Route>
          </Switch>
        </div>
      </div>

      {isPaletteOpen && (
        <CommandPalette commands={commands} onClose={() => setIsPaletteOpen(false)} />
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

      {pendingDeleteId && (
        <DeleteConfirmDialog
          taskTitle={taskState.tasks.find((task) => task.id === pendingDeleteId)?.title ?? 'This task'}
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
    </div>
  )
}

export default App
