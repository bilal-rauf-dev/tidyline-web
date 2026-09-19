import { useEffect, useId, useRef, useState } from 'react'
import { parseImportedTasks, serializeTasks } from '../utils/tasksIO'
import { ensureNotificationPermission, getNotificationPermission, isSoundEnabled, playChime, setSoundEnabled } from '../utils/notifications'
import { ACCENT_OPTIONS, DENSITY_OPTIONS } from '../hooks/useTheme'
import { Checkbox } from '../components/Checkbox'
import { BucketConfigMenu } from '../components/BucketConfigMenu'
import { BUCKET_ORDER } from '../utils/buckets'
import { TemplateSettings } from '../components/TemplateSettings'
import { ChevronDownIcon, GoogleIcon } from '../components/icons'
import { ImportReview } from '../components/ImportReview'

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
  bucketOrder = BUCKET_ORDER,
  onToggleBucket = () => {},
  onResetBuckets = () => {},
  templates = [],
  onRenameTemplate = () => {},
  onDeleteTemplate = () => {},
  overloadHours = 6,
  onOverloadHoursChange = () => {},
  profile = null,
  auth = null,
  offlineReady = false,
  offlineSupported = false,
  offlineFailed = false,
}) {
  const fileInputRef = useRef(null)
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission)
  const [workspaceName, setWorkspaceName] = useState(profile?.name ?? '')
  const [importPreview, setImportPreview] = useState(null)
  const [importError, setImportError] = useState('')
  const completedCount = tasks.filter((task) => task.done).length

  useEffect(() => {
    const refreshPermission = () => setNotificationPermission(getNotificationPermission())
    window.addEventListener('focus', refreshPermission)
    return () => window.removeEventListener('focus', refreshPermission)
  }, [])

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
        setImportPreview(parseImportedTasks(String(reader.result)))
        setImportError('')
      } catch (error) {
        setImportPreview(null)
        setImportError(error instanceof Error ? error.message : 'That file is not a valid TidyLine export.')
      }
    }
    reader.onerror = () => setImportError('Could not read that file.')
    reader.readAsText(file)
    event.target.value = ''
  }

  function confirmImport() {
    if (!importPreview) return
    try {
      importTasks(importPreview)
      setImportPreview(null)
      setImportError('')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not import those tasks.')
    }
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

  async function handleSignOut() {
    profile?.resetProfile?.()
    await auth?.signOut?.()
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

      {auth && (
        <SettingsSection
          title="Account"
          description={
            auth.isAuthenticated
              ? 'Signed in with Google (Supabase Auth)'
              : auth.backendStatus === 'checking'
                ? 'Checking cloud sync'
                : auth.backendStatus === 'incomplete'
                  ? 'Cloud database setup required'
                  : auth.backendStatus === 'unavailable'
                    ? 'Cloud sync unavailable'
                    : auth.canSignIn
                      ? 'Sign in with Google'
                      : 'Local mode (no backend configured)'
          }
          initiallyOpen
        >
          {auth.isAuthenticated ? (
            <div className="settings-row settings-account-row">
              <div className="settings-account-info">
                <div className="settings-user-avatar-wrap">
                  {auth.avatarUrl ? (
                    <img
                      src={auth.avatarUrl}
                      alt={auth.displayName}
                      className="settings-user-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="settings-user-avatar-fallback">
                      {auth.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="settings-user-meta">
                  <strong>{auth.displayName}</strong>
                  <small>{auth.email}</small>
                </div>
              </div>
              <button type="button" className="secondary" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : auth.canSignIn ? (
            <div className="settings-row">
              <span>
                Supabase Authentication
                <small className="settings-note">
                  Sign in with your Google account via Supabase Auth.
                </small>
              </span>
              <button
                type="button"
                className="secondary settings-google-btn"
                onClick={auth.signInWithGoogle}
              >
                <GoogleIcon size={16} />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : auth.backendStatus === 'incomplete' ? (
            <div className="settings-row">
              <span>
                Cloud database setup required
                <small className="settings-note">
                  The connection works, but TidyLine's database tables are missing. Apply the supplied Supabase migrations before signing in.
                </small>
              </span>
            </div>
          ) : auth.backendStatus === 'unavailable' ? (
            <div className="settings-row">
              <span>
                Cloud sync unavailable
                <small className="settings-note">
                  TidyLine could not verify the cloud database. Your local workspace remains available.
                </small>
              </span>
            </div>
          ) : auth.backendStatus === 'checking' ? (
            <div className="settings-row"><span>Checking cloud sync…</span></div>
          ) : (
            <div className="settings-row">
              <span>
                Local mode
                <small className="settings-note">
                  No cloud backend is configured, so tasks stay in this browser.
                </small>
              </span>
            </div>
          )}
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

      <SettingsSection title="Browser access" description="Offline reload" initiallyOpen>
        <div className="settings-row">
          <span>
            Offline copy
            <small className="settings-note">
              Core files can be saved for offline access. Test reloading in your browser before relying on it.
            </small>
          </span>
          <strong>{!offlineSupported || offlineFailed ? 'Unavailable in this browser' : offlineReady ? 'Core files saved' : 'Not ready yet'}</strong>
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications" description="Reminder preferences" initiallyOpen>

        <div className="settings-row">
          <span>
            Browser notifications
            <small className="settings-note">
              Scheduled reminders can appear while this page is open. Closed-page delivery is not available yet.
              Browsers may delay timers in background tabs.
            </small>
          </span>
          {notificationPermission === 'default' ? (
            <button
              type="button"
              className="secondary"
              onClick={async () => setNotificationPermission(await ensureNotificationPermission())}
            >
              Allow notifications
            </button>
          ) : (
            <strong>{notificationPermission === 'granted' ? 'Allowed' : notificationPermission === 'denied' ? 'Blocked in browser settings' : 'Unavailable in this browser'}</strong>
          )}
        </div>

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

      <SettingsSection title="Board timeline" description="Visible deadline buckets" initiallyOpen>

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
        </div>
        {importError && <p className="field-error" role="alert">{importError}</p>}
        {importPreview && (
          <ImportReview
            tasks={importPreview}
            existingCount={tasks.length}
            onConfirm={confirmImport}
            onCancel={() => setImportPreview(null)}
          />
        )}

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
