import { useCallback, useEffect, useMemo, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { MenuIcon } from './components/icons'
import { CommandPalette } from './components/CommandPalette'
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog'
import { TaskAddedToast } from './components/TaskAddedToast'
import { CompletionFeedbackToast } from './components/CompletionFeedbackToast'
import { NowPage } from './pages/NowPage'
import { BoardPage } from './pages/BoardPage'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { useTasks } from './hooks/useTasks'
import { useRoutines } from './hooks/useRoutines'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { useTheme } from './hooks/useTheme'
import { useProfile } from './hooks/useProfile'
import { useShortcuts } from './hooks/useShortcuts'
import { QuickAddModal } from './components/QuickAddModal'
import { toDateStr } from './utils/calendar'
import { WelcomeDialog } from './components/WelcomeDialog'

const DELETE_CONFIRM_KEY = 'tidyline:confirm-delete'
const ROUTES = new Set(['/', '/board', '/calendar', '/routines', '/settings'])

function loadDeleteConfirmation() {
  return localStorage.getItem(DELETE_CONFIRM_KEY) !== 'false'
}

function activeTaskId() {
  const focused = document.activeElement?.closest?.('[data-task-id]')
  if (focused) return focused.dataset.taskId
  return document.querySelector('[data-task-id]:hover')?.dataset.taskId ?? null
}

function App() {
  const taskState = useTasks()
  const routineState = useRoutines()
  const appearance = useTheme()
  const profile = useProfile()
  const [location, navigate] = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [askBeforeDelete, setAskBeforeDelete] = useState(loadDeleteConfirmation)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [taskAdded, setTaskAdded] = useState(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  useEffect(() => {
    if (!ROUTES.has(location)) navigate('/', { replace: true })
  }, [location, navigate])

  useEffect(() => {
    localStorage.setItem(DELETE_CONFIRM_KEY, String(askBeforeDelete))
  }, [askBeforeDelete])

  useEffect(() => {
    if (!isDrawerOpen) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsDrawerOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isDrawerOpen])

  const onNotificationComplete = useCallback(
    (taskId) => taskState.completeTask(taskId),
    [taskState],
  )
  useReminderNotifications(taskState.tasks, { onComplete: onNotificationComplete })

  function createTask(taskData) {
    const task = taskState.addTask(taskData)
    setTaskAdded({ id: task.id, title: task.title })
    return task
  }

  const focusSearch = useCallback(() => {
    const input = document.querySelector('.toolbar-search input')
    if (input) {
      input.focus()
      return
    }
    navigate('/board')
    window.setTimeout(() => document.querySelector('.toolbar-search input')?.focus(), 80)
  }, [navigate])

  const requestDelete = useCallback(
    (taskId) => {
      setTaskAdded(null)
      if (askBeforeDelete) setPendingDeleteId(taskId)
      else taskState.deleteTask(taskId)
    },
    [askBeforeDelete, taskState],
  )

  const commands = useMemo(
    () => [
      { id: 'new', label: 'Create task', hint: 'N/Q', run: () => setIsQuickAddOpen(true) },
      { id: 'search', label: 'Focus search', hint: '/', run: focusSearch },
      { id: 'now', label: 'Go to Now', run: () => navigate('/') },
      { id: 'board', label: 'Go to Board', run: () => navigate('/board') },
      { id: 'calendar', label: 'Go to Calendar', run: () => navigate('/calendar') },
      { id: 'routines', label: 'Go to Routines', run: () => navigate('/routines') },
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
        run: () => appearance.setDensity(appearance.density === 'compact' ? 'comfortable' : 'compact'),
      },
    ],
    [appearance, focusSearch, navigate],
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
          taskState.toggleTask(id)
          return true
        },
        onDeleteActive: () => {
          const id = activeTaskId()
          if (!id) return false
          requestDelete(id)
          return true
        },
      }),
      [focusSearch, requestDelete, taskState],
    ),
  )

  function openFullForm(parsed) {
    const params = new URLSearchParams({ add: '1' })
    if (parsed.title) params.set('title', parsed.title)
    if (parsed.deadline) params.set('deadline', toDateStr(parsed.deadline))
    if (parsed.tags.length) params.set('tags', parsed.tags.join(', '))
    if (parsed.reminderMinutes) params.set('reminderMinutes', String(parsed.reminderMinutes))
    if (parsed.durationMinutes) params.set('durationMinutes', String(parsed.durationMinutes))
    if (parsed.recurrence) params.set('recurrence', JSON.stringify(parsed.recurrence))
    navigate(`/board?${params.toString()}`)
  }

  if (!profile.isSetUp) {
    return (
      <WelcomeDialog
        accent={appearance.accent}
        onAccentChange={appearance.setAccent}
        onImportTasks={taskState.importTasks}
        onImportRoutines={routineState.importRoutines}
        onComplete={profile.completeSetup}
      />
    )
  }

  return (
    <div className={isCollapsed ? 'app-layout collapsed' : 'app-layout'}>
      <header className="topbar">
        <button type="button" className="icon-button" onClick={() => setIsDrawerOpen(true)} aria-label="Open navigation" aria-expanded={isDrawerOpen} aria-controls="sidebar-nav">
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
        workspaceName={profile.name}
        tasks={taskState.tasks}
        onOpenTask={(taskId) => {
          setIsDrawerOpen(false)
          navigate(`/board?expand=${encodeURIComponent(taskId)}`)
        }}
      />

      {isDrawerOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setIsDrawerOpen(false)} />}

      <div className="app-content">
        {taskState.dataError && <p className="data-error" role="alert">{taskState.dataError}</p>}
        <div className="route-view" key={location}>
          <Switch>
            <Route path="/">
              <NowPage
                tasks={taskState.tasks}
                onComplete={taskState.completeTask}
                onStart={taskState.startTask}
                onPause={taskState.pauseTask}
              />
            </Route>
            <Route path="/board">
              <BoardPage {...taskState} addTask={createTask} deleteTask={requestDelete} />
            </Route>
            <Route path="/calendar">
              <CalendarPage tasks={taskState.tasks} addTask={createTask} setDeadline={taskState.setDeadline} />
            </Route>
            <Route path="/routines">
              <RoutinesPage
                routines={routineState.routines}
                dataError={routineState.dataError}
                onAdd={routineState.addRoutine}
                onUpdate={routineState.updateRoutine}
                onDelete={routineState.deleteRoutine}
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
                profile={profile}
                routines={routineState.routines}
                importRoutines={routineState.importRoutines}
              />
            </Route>
          </Switch>
        </div>
      </div>

      {isPaletteOpen && <CommandPalette commands={commands} onClose={() => setIsPaletteOpen(false)} />}

      {isQuickAddOpen && (
        <QuickAddModal
          isOpen
          onClose={() => setIsQuickAddOpen(false)}
          onAddTask={createTask}
          onOpenFullForm={openFullForm}
          tasks={taskState.tasks}
        />
      )}

      {pendingDeleteId && (
        <DeleteConfirmDialog
          taskTitle={taskState.tasks.find((task) => task.id === pendingDeleteId)?.title ?? 'This task'}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={(dontAskAgain) => {
            if (dontAskAgain) setAskBeforeDelete(false)
            taskState.deleteTask(pendingDeleteId)
            setPendingDeleteId(null)
          }}
        />
      )}

      {taskAdded && (
        <TaskAddedToast
          key={taskAdded.id}
          title={taskAdded.title}
          onEdit={() => {
            navigate(`/board?expand=${encodeURIComponent(taskAdded.id)}`)
            setTaskAdded(null)
          }}
          onDismiss={() => setTaskAdded(null)}
        />
      )}

      {taskState.completionFeedback && (
        <CompletionFeedbackToast
          key={taskState.completionFeedback.id}
          feedback={taskState.completionFeedback}
          onDismiss={taskState.dismissCompletionFeedback}
        />
      )}
    </div>
  )
}

export default App
