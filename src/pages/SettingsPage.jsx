import { useRef, useState } from 'react'
import { parseImportedTasks, serializeTasks } from '../utils/tasksIO'
import { isSoundEnabled, playChime, setSoundEnabled } from '../utils/notifications'
import { ACCENT_OPTIONS, DENSITY_OPTIONS } from '../hooks/useTheme'
import { Checkbox } from '../components/Checkbox'
import { BucketConfigMenu } from '../components/BucketConfigMenu'
import { BUCKET_ORDER } from '../utils/buckets'
import { TemplateSettings } from '../components/TemplateSettings'

export function SettingsPage({
  tasks,
  appearance,
  importTasks,
  clearCompleted,
  askBeforeDelete,
  onAskBeforeDeleteChange,
  bucketOrder = BUCKET_ORDER,
  onToggleBucket = () => {},
  onResetBuckets = () => {},
  templates = [],
  onRenameTemplate = () => {},
  onDeleteTemplate = () => {},
  overloadHours = 6,
  onOverloadHoursChange = () => {},
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

      <section className="entry-card" id="board-buckets">
        <h2>Board timeline</h2>

        <div className="settings-row">
          <span>
            Visible buckets
            <small className="settings-note">
              Today and Later stay visible; Overdue remains automatic and separate.
            </small>
          </span>
          <BucketConfigMenu
            bucketOrder={bucketOrder}
            onToggleBucket={onToggleBucket}
            onReset={onResetBuckets}
          />
        </div>
      </section>

      <section className="entry-card">
        <h2>Calendar workload</h2>
        <div className="settings-row">
          <span>
            Flag overloaded days above
            <small className="settings-note">
              Uses the total of task estimates; tasks without estimates remain visible but add no hours.
            </small>
          </span>
          <label className="settings-number">
            <input
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={overloadHours}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (value >= 1 && value <= 24) onOverloadHoursChange(value)
              }}
            />
            hours
          </label>
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
        <h2>Task templates</h2>
        <p className="card-note">
          Templates reuse task details while leaving the title and deadline blank.
        </p>
        <TemplateSettings
          templates={templates}
          onRename={onRenameTemplate}
          onDelete={onDeleteTemplate}
        />
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
