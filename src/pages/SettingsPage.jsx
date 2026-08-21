import { useId, useRef, useState } from 'react'
import { parseImportedTasks, serializeTasks } from '../utils/tasksIO'
import { isSoundEnabled, playChime, setSoundEnabled } from '../utils/notifications'
import { ACCENT_OPTIONS, DENSITY_OPTIONS } from '../hooks/useTheme'
import { Checkbox } from '../components/Checkbox'
import { TemplateSettings } from '../components/TemplateSettings'
import { ChevronDownIcon } from '../components/icons'

function SettingsSection({ title, description, initiallyOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  const contentId = useId()

  return (
    <section className={isOpen ? 'entry-card settings-section expanded' : 'entry-card settings-section'}>
      <button
        type="button"
        className="settings-section-toggle"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>
        <ChevronDownIcon />
      </button>
      <div id={contentId} className="settings-section-content" hidden={!isOpen}>
        {children}
      </div>
    </section>
  )
}

export function SettingsPage({
  tasks,
  appearance,
  importTasks,
  clearCompleted,
  askBeforeDelete,
  onAskBeforeDeleteChange,
  templates = [],
  onRenameTemplate = () => {},
  onDeleteTemplate = () => {},
  overloadHours = 6,
  onOverloadHoursChange = () => {},
  profile = null,
}) {
  const fileInputRef = useRef(null)
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const [workspaceName, setWorkspaceName] = useState(profile?.name ?? '')
  const [importMessage, setImportMessage] = useState('')
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
        const result = parseImportedTasks(String(reader.result))
        importTasks(result)
        setImportMessage(`${result.tasks.length} imported, ${result.repaired} repaired, ${result.skipped} skipped.`)
      } catch (error) {
        setImportMessage(error.message)
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
    <main className="app-shell settings-shell">
      <header className="hero">
        <h1>Settings</h1>
      </header>

      {profile && (
        <SettingsSection title="Local profile" description="This device only" initiallyOpen>
          <div className="settings-row settings-profile-row">
            <label className="settings-profile-field">
              <span>
                Workspace name
                <small className="settings-note">
                  Used to distinguish this local TidyLine workspace. No account is created.
                </small>
              </span>
              <input
                type="text"
                maxLength="48"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                aria-label="Workspace name"
              />
            </label>
            <button type="button" className="secondary" onClick={() => profile.setName(workspaceName)}>
              Save name
            </button>
          </div>
        </SettingsSection>
      )}

      <SettingsSection title="Appearance" description="Theme, accent, and density" initiallyOpen>

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
      </SettingsSection>

      <SettingsSection title="Notifications" description="Reminder preferences" initiallyOpen>

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
      </SettingsSection>

      <SettingsSection title="Calendar workload" description="Overload threshold" initiallyOpen>
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
      </SettingsSection>

      <SettingsSection title="Task actions" description="Deletion confirmation" initiallyOpen>

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
      </SettingsSection>

      <SettingsSection title="Task templates" description="Reusable task details">
        <p className="card-note">
          Templates reuse task details while leaving the title and deadline blank.
        </p>
        <TemplateSettings
          templates={templates}
          onRename={onRenameTemplate}
          onDelete={onDeleteTemplate}
        />
      </SettingsSection>

      <SettingsSection title="Your data" description="Import, export, and cleanup">

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
          {importMessage && <span className="settings-note" role="status">{importMessage}</span>}
        </div>

        <div className="settings-row">
          <span>Clear completed tasks ({completedCount})</span>
          <button type="button" className="secondary" onClick={handleClearCompleted}>
            Clear completed
          </button>
        </div>
      </SettingsSection>
    </main>
  )
}
