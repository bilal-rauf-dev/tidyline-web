import { useEffect, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { MenuIcon } from './components/icons'
import { HomePage } from './pages/HomePage'
import { BoardPage } from './pages/BoardPage'
import { CalendarPage } from './pages/CalendarPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useTasks } from './hooks/useTasks'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { useTheme } from './hooks/useTheme'

function App() {
  const taskState = useTasks()
  const { theme, toggleTheme } = useTheme()
  const [location] = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useReminderNotifications(taskState.tasks)

  useEffect(() => {
    if (!isDrawerOpen) {
      return
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

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
        <span className="topbar-title">Tidyline</span>
      </header>

      <Sidebar
        isOpen={isDrawerOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
        onNavigate={() => setIsDrawerOpen(false)}
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
              <HomePage tasks={taskState.tasks} />
            </Route>
            <Route path="/board">
              <BoardPage {...taskState} />
            </Route>
            <Route path="/calendar">
              <CalendarPage tasks={taskState.tasks} addTask={taskState.addTask} />
            </Route>
            <Route path="/analytics">
              <AnalyticsPage tasks={taskState.tasks} />
            </Route>
            <Route path="/settings">
              <SettingsPage
                tasks={taskState.tasks}
                theme={theme}
                toggleTheme={toggleTheme}
                importTasks={taskState.importTasks}
                clearCompleted={taskState.clearCompleted}
              />
            </Route>
          </Switch>
        </div>
      </div>
    </div>
  )
}

export default App
