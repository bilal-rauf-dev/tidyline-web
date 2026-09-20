import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { MenuIcon } from './components/icons'
import { CommandPalette } from './components/CommandPalette'
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog'
import { TaskAddedToast } from './components/TaskAddedToast'
import { ShutdownDialog } from './components/ShutdownDialog'
import { MigrationBanner } from './components/MigrationBanner'
import { LoadingSpinner } from './components/LoadingSpinner'
import { DbErrorToast } from './components/DbErrorToast'
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
import { useUserSettings } from './hooks/useUserSettings'
import { PlannerPage } from './pages/PlannerPage'
import { SomedayPage } from './pages/SomedayPage'
import { DEFAULT_OVERLOAD_HOURS } from './utils/workload'
import { QuickAddModal } from './components/QuickAddModal'
import { toDateStr } from './utils/calendar'
import { WelcomeDialog } from './components/WelcomeDialog'
import { LocalDataRecovery } from './components/LocalDataRecovery'
import { SyncStatusBanner } from './components/SyncStatusBanner'
import { AccountLoadError } from './components/AccountLoadError'
import { OfflineBanner } from './components/OfflineBanner'
import { registerNotificationWorker } from './utils/notifications'
import { usePushNotifications } from './hooks/usePushNotifications'

// ── Keys still kept in localStorage (guest + authenticated alike) ─────────────
// tidyline:notificationSound is intentionally device-local (not synced to Supabase).
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
  if (focused) return focused.dataset.taskId
  return document.querySelector('[data-task-id]:hover')?.dataset.taskId ?? null
}

function App() {
  const auth          = useAuth()
  const pushNotifications = usePushNotifications(auth)
  const settingsState = useUserSettings(auth)

  // Build the settingsCtx object passed to settings-aware hooks.
  const settingsCtx = useMemo(() => ({
    settings:        settingsState.settings,
    updateSettings:  settingsState.updateSettings,
    isAuthenticated: auth.isAuthenticated,
  }), [settingsState.settings, settingsState.updateSettings, auth.isAuthenticated])

  const taskState       = useTasks(auth)
  const appearance      = useTheme(settingsCtx)
  const profile         = useProfile(auth.user, auth.isAuthenticated ? settingsCtx : null)
  const bucketConfig    = useBucketConfig(settingsCtx)
  const templateState   = useTemplates(settingsCtx)
  const savedFilterState = useSavedFilters(settingsCtx)

  const [location, navigate] = useLocation()
  const [isDrawerOpen,   setIsDrawerOpen]   = useState(false)
  const [isCollapsed,    setIsCollapsed]    = useState(false)
  const [isPaletteOpen,  setIsPaletteOpen]  = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isShutdownOpen, setIsShutdownOpen] = useState(false)
  const [migrationBusy, setMigrationBusy] = useState(false)
  const migrationBusyRef = useRef(false)
  const [taskAdded,      setTaskAdded]      = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [offlineFailed, setOfflineFailed] = useState(false)
  const [offlineSupported] = useState(() => typeof navigator !== 'undefined' && 'serviceWorker' in navigator)

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine !== false)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined
    let active = true
    const channels = new Set()
    const timeouts = new Set()
    let registration = null
    let installingWorker = null

    async function checkOfflineCopy() {
      // A complete cache is useful only once this page is controlled by the
      // worker. Registration alone does not guarantee offline navigation.
      const controller = navigator.serviceWorker.controller
      if (!active || !import.meta.env.PROD || !registration?.active || !controller) return
      const channel = new MessageChannel()
      channels.add(channel)
      const timeout = window.setTimeout(() => {
        channel.port1.close()
        channels.delete(channel)
        timeouts.delete(timeout)
      }, 5000)
      timeouts.add(timeout)
      channel.port1.onmessage = (event) => {
        if (active) setOfflineReady(event.data?.ready === true)
        window.clearTimeout(timeout)
        timeouts.delete(timeout)
        channel.port1.close()
        channels.delete(channel)
      }
      controller.postMessage({ type: 'tidyline:offline-status' }, [channel.port2])
    }

    registerNotificationWorker().then((registered) => {
      if (!active) return
      registration = registered
      if (!registration) {
        setOfflineFailed(true)
        return
      }
      checkOfflineCopy()
      installingWorker = registration.installing || registration.waiting
      installingWorker?.addEventListener('statechange', checkOfflineCopy)
    })
    navigator.serviceWorker.addEventListener('controllerchange', checkOfflineCopy)
    return () => {
      active = false
      navigator.serviceWorker.removeEventListener('controllerchange', checkOfflineCopy)
      installingWorker?.removeEventListener('statechange', checkOfflineCopy)
      for (const timeout of timeouts) window.clearTimeout(timeout)
      for (const channel of channels) channel.port1.close()
    }
  }, [])

  // ── Overload hours & delete-confirmation ──────────────────────────────────
  // For authenticated users these come from user_settings once loaded;
  // for guests they remain in localStorage as before.
  const [askBeforeDelete, setAskBeforeDelete] = useState(loadDeleteConfirmation)
  const [overloadHours,   setOverloadHours]   = useState(loadOverloadHours)

  // Apply Supabase values when settings first load (authenticated only).
  const settingsAppliedRef = useRef(false)
  useEffect(() => {
    if (auth.isAuthenticated && settingsState.settings !== null && !settingsAppliedRef.current) {
      settingsAppliedRef.current = true
      setAskBeforeDelete(settingsState.settings.confirmDelete)
      setOverloadHours(settingsState.settings.overloadHours)
    }
  }, [auth.isAuthenticated, settingsState.settings])

  // Persist changes — Supabase for authenticated, localStorage for guests.
  useEffect(() => {
    if (auth.isAuthenticated && settingsState.settings !== null) {
      settingsState.updateSettings({ confirmDelete: askBeforeDelete })
    } else if (!auth.isAuthenticated) {
      localStorage.setItem(DELETE_CONFIRM_KEY, String(askBeforeDelete))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askBeforeDelete])

  useEffect(() => {
    if (auth.isAuthenticated && settingsState.settings !== null) {
      settingsState.updateSettings({ overloadHours })
    } else if (!auth.isAuthenticated) {
      localStorage.setItem(OVERLOAD_HOURS_KEY, String(overloadHours))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overloadHours])

  // ── Task helpers ──────────────────────────────────────────────────────────
  const { completeTask, toggleTask, deleteTask } = taskState

  const createTask = useCallback(
    (taskData) => {
      const task = taskState.addTask(taskData)
      if (!task) return null
      setTaskAdded({ id: task.id, title: task.title })
      return task
    },
    [taskState],
  )

  const dismissTaskAdded = useCallback(() => setTaskAdded(null), [])

  const editAddedTask = useCallback(() => {
    if (!taskAdded) return
    navigate(`/board?expand=${encodeURIComponent(taskAdded.id)}`)
    setTaskAdded(null)
  }, [navigate, taskAdded])

  const handleOpenFullForm = useCallback(
    (parsed) => {
      const params = new URLSearchParams()
      params.set('add', '1')
      if (parsed.title)            params.set('title', parsed.title)
      if (parsed.deadline)         params.set('deadline', toDateStr(parsed.deadline))
      if (parsed.deadlineTime)     params.set('deadlineTime', parsed.deadlineTime)
      if (parsed.tags?.length > 0) params.set('tags', parsed.tags.join(', '))
      if (parsed.startDate)        params.set('startDate', toDateStr(parsed.startDate))
      if (parsed.reminderMinutes)  params.set('reminderMinutes', String(parsed.reminderMinutes))
      if (parsed.durationMinutes)  params.set('durationMinutes', String(parsed.durationMinutes))
      if (parsed.recurrence)       params.set('recurrence', JSON.stringify(parsed.recurrence))
      if (parsed.priority)         params.set('priority', parsed.priority)
      if (parsed.energy)           params.set('energy', parsed.energy)
      if (parsed.planForToday)     params.set('planForToday', 'true')
      navigate(`/board?${params.toString()}`)
    },
    [navigate],
  )

  const requestDelete = useCallback(
    (taskId) => {
      setTaskAdded(null)
      if (askBeforeDelete) { setPendingDeleteId(taskId); return }
      deleteTask(taskId)
    },
    [askBeforeDelete, deleteTask],
  )

  const cancelDelete  = useCallback(() => setPendingDeleteId(null), [])

  const confirmDelete = useCallback(
    (dontAskAgain) => {
      if (!pendingDeleteId) return
      if (dontAskAgain) setAskBeforeDelete(false)
      deleteTask(pendingDeleteId)
      setPendingDeleteId(null)
    },
    [deleteTask, pendingDeleteId],
  )

  const onNotificationComplete = useCallback(
    (taskId) => completeTask(taskId),
    [completeTask],
  )

  useReminderNotifications(taskState.tasks, {
    onComplete: onNotificationComplete,
    enabled: !['checking', 'subscribed'].includes(pushNotifications.status),
  })

  // Keyboard: close drawer on Escape.
  useEffect(() => {
    if (!isDrawerOpen) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsDrawerOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  const focusSearch = useCallback(() => {
    const input = document.querySelector('.toolbar-search input')
    if (input) { input.focus(); return }
    navigate('/board')
    setTimeout(() => document.querySelector('.toolbar-search input')?.focus(), 80)
  }, [navigate])

  const commands = useMemo(
    () => [
      { id: 'new',      label: 'Create task',                             hint: 'N/Q', run: () => setIsQuickAddOpen(true) },
      { id: 'search',   label: 'Focus search',                            hint: '/',   run: focusSearch },
      { id: 'home',     label: 'Go to Home',                                           run: () => navigate('/') },
      { id: 'board',    label: 'Go to Board',                                          run: () => navigate('/board') },
      { id: 'calendar', label: 'Go to Calendar',                                       run: () => navigate('/calendar') },
      { id: 'planner',  label: 'Go to Day planner',                                   run: () => navigate('/planner') },
      { id: 'someday',  label: 'Go to Someday / Maybe',                               run: () => navigate('/someday') },
      { id: 'analytics',label: 'Go to Analytics',                                     run: () => navigate('/analytics') },
      { id: 'settings', label: 'Go to Settings',                                      run: () => navigate('/settings') },
      { id: 'archive',  label: 'Show archived tasks',                                  run: () => navigate('/board?view=archived') },
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
        onPalette:    () => setIsPaletteOpen((open) => !open),
        onEscape:     () => { setIsPaletteOpen(false); setIsQuickAddOpen(false) },
        onQuickAdd:   () => setIsQuickAddOpen(true),
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

  // ── Migration: combine tasks + settings pending migrations ────────────────
  const showMigrationBanner =
    auth.isAuthenticated &&
    !taskState.loading &&
    !settingsState.settingsLoading &&
    (taskState.hasPendingMigration || settingsState.hasPendingSettingsMigration)

  const localTaskCount = useMemo(() => {
    if (!showMigrationBanner) return 0
    try {
      const raw = localStorage.getItem('tidyline:tasks')
      const parsed = JSON.parse(raw ?? '[]')
      return Array.isArray(parsed) ? parsed.length : 0
    } catch { return 0 }
  }, [showMigrationBanner])

  async function handleMigrateAll() {
    if (migrationBusyRef.current) return
    migrationBusyRef.current = true
    setMigrationBusy(true)
    try {
      if (taskState.hasPendingMigration)              await taskState.migrateLocalTasks()
      if (settingsState.hasPendingSettingsMigration)  await settingsState.migrateLocalSettings()
    } finally {
      migrationBusyRef.current = false
      setMigrationBusy(false)
    }
  }

  function handleDismissMigration() {
    taskState.dismissMigration()
    settingsState.dismissSettingsMigration()
  }

  // ── DB error surface (tasks or settings) ─────────────────────────────────
  const dbError   = taskState.dbError ?? settingsState.settingsError
  function clearError() {
    if (taskState.dbError)        taskState.clearDbError()
    if (settingsState.settingsError) settingsState.clearSettingsError()
  }

  // ── Loading gates ─────────────────────────────────────────────────────────
  // Keep guest data out of view until a persisted account session is resolved.
  if (auth.loading || taskState.loading || (auth.isAuthenticated && settingsState.settingsLoading)) {
    return <LoadingSpinner />
  }

  if (auth.isAuthenticated && taskState.accountLoadError) {
    return (
      <AccountLoadError
        onRetry={taskState.retryAccountLoad}
        onSignOut={auth.signOut}
      />
    )
  }

  if (!auth.isAuthenticated && !auth.loading && taskState.localDataError) {
    return (
      <LocalDataRecovery
        error={taskState.localDataError}
        actionError={taskState.dbError}
        onDiscard={taskState.discardBrokenLocalTasks}
        onGoogleSignIn={auth.canSignIn ? auth.signInWithGoogle : undefined}
      />
    )
  }

  // 2. Show WelcomeDialog for guests who haven't set up yet (after auth resolves).
  if (!profile.isSetUp && !auth.isAuthenticated && !auth.loading) {
    return (
      <WelcomeDialog
        onImportTasks={taskState.importTasks}
        onComplete={profile.completeSetup}
        onGoogleSignIn={auth.canSignIn ? auth.signInWithGoogle : undefined}
        existingTaskCount={taskState.tasks.length}
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
        onOpenPalette={() => { setIsDrawerOpen(false); setIsPaletteOpen(true) }}
        onOpenShutdown={() => { setIsDrawerOpen(false); setIsShutdownOpen(true) }}
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
        {!isOnline && <OfflineBanner isAuthenticated={auth.isAuthenticated} />}
        {/* One-time migration banner */}
        {showMigrationBanner && (
          <MigrationBanner
            taskCount={localTaskCount}
            accountTaskCount={taskState.tasks.length}
            hasSettings={settingsState.hasPendingSettingsMigration}
            onMigrate={handleMigrateAll}
            onDismiss={handleDismissMigration}
            busy={migrationBusy}
          />
        )}

        {auth.isAuthenticated && (
          <SyncStatusBanner
            count={taskState.pendingSyncCount}
            syncing={taskState.syncing}
            failed={taskState.syncError}
            onRetry={taskState.retrySync}
          />
        )}

        <div className="route-view" key={location}>
          <Switch>
            <Route path="/">
              <HomePage
                tasks={taskState.tasks}
                workspaceName={profile.name}
                auth={{ ...auth, signOut: pushNotifications.signOut }}
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
                rescheduleTasks={taskState.rescheduleTasks}
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
                auth={{ ...auth, signOut: pushNotifications.signOut }}
                pushNotifications={pushNotifications}
                offlineReady={offlineReady}
                offlineSupported={offlineSupported}
                offlineFailed={offlineFailed}
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

      {/* Supabase error toast */}
      {dbError && (
        <DbErrorToast message={dbError} onDismiss={clearError} />
      )}
    </div>
  )
}

export default App
