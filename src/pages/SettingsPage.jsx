import { useRef } from 'react'
import { parseImportedTasks, serializeTasks } from '../utils/tasksIO'

export function SettingsPage({ tasks, theme, toggleTheme, importTasks, clearCompleted }) {
  const fileInputRef = useRef(null)
  const completedCount = tasks.filter((task) => task.done).length

  function handleExport() {
    const blob = new Blob([serializeTasks(tasks)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tidyline-tasks.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleImportChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseImportedTasks(String(reader.result))
        importTasks(imported)
      } catch {
        window.alert('That file is not a valid TidyLine export.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function handleClearCompleted() {
    if (completedCount === 0) {
      return
    }

    if (window.confirm(`Remove ${completedCount} completed task(s)? This can't be undone.`)) {
      clearCompleted()
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Settings</h1>
      </header>

      <section className="entry-card">
        <h2>Appearance</h2>
        <div className="settings-row">
          <span>Theme</span>
          <button type="button" className="secondary" onClick={toggleTheme}>
            {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          </button>
        </div>
      </section>

      <section className="entry-card">
        <h2>Your data</h2>

        <div className="settings-row">
          <span>Export tasks</span>
          <button type="button" className="secondary" onClick={handleExport}>
            Export JSON
          </button>
        </div>

        <div className="settings-row">
          <span>Import tasks</span>
          <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportChange}
            hidden
          />
        </div>

        <div className="settings-row">
          <span>Clear completed tasks ({completedCount})</span>
          <button type="button" className="secondary" onClick={handleClearCompleted}>
            Clear completed
          </button>
        </div>
      </section>
    </main>
  )
}
