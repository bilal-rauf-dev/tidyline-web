import { useRef, useState } from 'react'
import { parseImportedTasks, serializeTasks } from '../utils/tasksIO'
import { isSoundEnabled, playChime, setSoundEnabled } from '../utils/notifications'
import { ACCENT_OPTIONS, DENSITY_OPTIONS } from '../hooks/useTheme'
import { Checkbox } from '../components/Checkbox'

export function SettingsPage({
  tasks,
  appearance,
  importTasks,
  clearCompleted,
  askBeforeDelete,
  onAskBeforeDeleteChange,
}) {
  const fileInputRef = useRef(null)
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
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
        importTasks(parseImportedTasks(String(reader.result)))
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

    if (window.confirm(`Remove ${completedCount} completed task(s)?`)) {
      clearCompleted()
    }
  }

  function toggleSound() {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)

    if (next) {
      playChime()
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
          <button type="button" className="secondary" onClick={appearance.toggleTheme}>
            {appearance.theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          </button>
        </div>

        <div className="settings-row">
          <span>
            Accent colour
            <small className="settings-note">
              One hue plays the accent role — picking another swaps it.
            </small>
          </span>
          <div className="accent-choices" role="group" aria-label="Accent colour">
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  appearance.accent === option.value ? 'accent-swatch active' : 'accent-swatch'
                }
                style={{ background: option.value }}
                onClick={() => appearance.setAccent(option.value)}
                aria-pressed={appearance.accent === option.value}
                aria-label={option.label}
                title={option.label}
              />
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span>Density</span>
          <div className="segmented" role="group" aria-label="Density">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={appearance.density === option.value ? 'segment active' : 'segment'}
                onClick={() => appearance.setDensity(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="entry-card">
        <h2>Notifications</h2>

        <div className="settings-row">
          <span>
            Reminder sound
            <small className="settings-note">
              Plays a short chime when a reminder fires.
            </small>
          </span>
          <button type="button" className="secondary" onClick={toggleSound}>
            {soundOn ? 'Mute' : 'Unmute'}
          </button>
        </div>
      </section>

      <section className="entry-card">
        <h2>Task actions</h2>

        <div className="settings-row">
          <span>
            Ask before deleting tasks
            <small className="settings-note">
              Show a confirmation before a task is permanently removed.
            </small>
          </span>
          <label className="settings-check">
            <Checkbox
              checked={askBeforeDelete}
              onChange={(event) => onAskBeforeDeleteChange(event.target.checked)}
              aria-label="Ask before deleting tasks"
            />
          </label>
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
          <button
            type="button"
            className="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
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
