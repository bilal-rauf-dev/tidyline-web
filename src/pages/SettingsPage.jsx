import { useId, useRef, useState } from 'react'
import { parseImportedTasks, serializeTasks } from '../utils/tasksIO'
import { isSoundEnabled, playChime, setSoundEnabled } from '../utils/notifications'
import { ACCENT_OPTIONS, DENSITY_OPTIONS } from '../hooks/useTheme'
import { Checkbox } from '../components/Checkbox'
import { ChevronDownIcon } from '../components/icons'
import { CALIBRATION_MIN_SAMPLES, getCalibration } from '../utils/calibration'

function SettingsSection({ title, description, initiallyOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  const contentId = useId()

  return (
    <section className={isOpen ? 'entry-card settings-section expanded' : 'entry-card settings-section'}>
      <button type="button" className="settings-section-toggle" aria-expanded={isOpen} aria-controls={contentId} onClick={() => setIsOpen((open) => !open)}>
        <span><strong>{title}</strong>{description && <small>{description}</small>}</span>
        <ChevronDownIcon />
      </button>
      <div id={contentId} className="settings-section-content" hidden={!isOpen}>{children}</div>
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
  profile,
}) {
  const fileInputRef = useRef(null)
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const [workspaceName, setWorkspaceName] = useState(profile?.name ?? '')
  const completedCount = tasks.filter((task) => task.done).length
  const calibration = getCalibration(tasks)

  function exportTasks() {
    const url = URL.createObjectURL(new Blob([serializeTasks(tasks)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'tidyline-tasks.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

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

  return (
    <main className="app-shell settings-shell">
      <header className="hero"><h1>Settings</h1></header>

      <SettingsSection title="Local profile" description="This device only" initiallyOpen>
        <div className="settings-row settings-profile-row">
          <label className="settings-profile-field">
            <span>Workspace name<small className="settings-note">No account is created.</small></span>
            <input maxLength="48" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} aria-label="Workspace name" />
          </label>
          <button type="button" className="secondary" onClick={() => profile.setName(workspaceName)}>Save name</button>
        </div>
      </SettingsSection>

      <SettingsSection title="Appearance" description="Theme, accent, and density" initiallyOpen>
        <div className="settings-row">
          <span>Theme</span>
          <button type="button" className="secondary" onClick={appearance.toggleTheme}>
            {appearance.theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          </button>
        </div>
        <div className="settings-row">
          <span>Accent colour</span>
          <div className="accent-choices" role="group" aria-label="Accent colour">
            {ACCENT_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={appearance.accent === option.value ? 'accent-swatch active' : 'accent-swatch'} style={{ background: option.value }} onClick={() => appearance.setAccent(option.value)} aria-pressed={appearance.accent === option.value} aria-label={option.label} />
            ))}
          </div>
        </div>
        <div className="settings-row">
          <span>Density</span>
          <div className="segmented" role="group" aria-label="Density">
            {DENSITY_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={appearance.density === option.value ? 'segment active' : 'segment'} onClick={() => appearance.setDensity(option.value)}>{option.label}</button>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Reminders" description="Browser behavior" initiallyOpen>
        <div className="settings-row">
          <span>
            Reminder sound
            <small className="settings-note">Alerts are checked only while TidyLine is open in a browser tab. Closing it stops reminder delivery.</small>
          </span>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const next = !soundOn
              setSoundEnabled(next)
              setSoundOn(next)
              if (next) playChime()
            }}
          >
            {soundOn ? 'Mute' : 'Unmute'}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Calibration" description="Learned from completed timed tasks" initiallyOpen>
        <div className="settings-row">
          <span>
            Personal estimate multiplier
            <small className="settings-note">
              {calibration.calibrated
                ? `Your timed tasks usually take about ${calibration.multiplier.toFixed(1)}× your estimate, based on ${calibration.sampleCount} tasks.`
                : `Time ${CALIBRATION_MIN_SAMPLES - calibration.sampleCount} more estimated task${CALIBRATION_MIN_SAMPLES - calibration.sampleCount === 1 ? '' : 's'} to calibrate this automatically.`}
            </small>
          </span>
          <strong>{calibration.calibrated ? `${calibration.multiplier.toFixed(1)}×` : 'Learning'}</strong>
        </div>
      </SettingsSection>

      <SettingsSection title="Task actions" description="Deletion confirmation">
        <div className="settings-row">
          <span>Ask before deleting tasks</span>
          <label className="settings-check">
            <Checkbox checked={askBeforeDelete} onChange={(event) => onAskBeforeDeleteChange(event.target.checked)} aria-label="Ask before deleting tasks" />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Your data" description="Import, export, and cleanup">
        <div className="settings-row"><span>Export tasks</span><button type="button" className="secondary" onClick={exportTasks}>Export JSON</button></div>
        <div className="settings-row">
          <span>Import tasks</span>
          <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={importFile} hidden />
        </div>
        <div className="settings-row">
          <span>Clear completed tasks ({completedCount})</span>
          <button
            type="button"
            className="secondary"
            disabled={completedCount === 0}
            onClick={() => {
              if (completedCount && window.confirm(`Remove ${completedCount} completed task(s)?`)) clearCompleted()
            }}
          >
            Clear completed
          </button>
        </div>
      </SettingsSection>
    </main>
  )
}
