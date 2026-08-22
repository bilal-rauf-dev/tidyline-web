import { useEffect, useRef, useState } from 'react'
import { parseImportedTasks } from '../utils/tasksIO'
import { parseImportedRoutines } from '../utils/routineIO'
import { ACCENT_OPTIONS } from '../hooks/useTheme'
import { BrandMonogram } from './BrandMonogram'

export function WelcomeDialog({ accent, onAccentChange, onImportTasks, onImportRoutines, onComplete }) {
  const nameInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const [name, setName] = useState('')
  const [importMessage, setImportMessage] = useState('')

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  function finishAsGuest() {
    onComplete('', true)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) return
    onComplete(name, false)
  }

  function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = String(reader.result)
        const tasks = parseImportedTasks(raw)
        const routines = parseImportedRoutines(raw)
        onImportTasks(tasks)
        onImportRoutines?.(routines ?? [])
        setImportMessage(`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}${routines?.length ? ` and ${routines.length} ${routines.length === 1 ? 'routine' : 'routines'}` : ''} imported.`)
      } catch {
        setImportMessage('That file is not a valid TidyLine export.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <main className="welcome-screen">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-brand">
          <BrandMonogram size={30} />
          <span>TidyLine</span>
        </div>
        <div className="welcome-copy">
          <p className="welcome-kicker">Local workspace</p>
          <h1 id="welcome-title">Make this space yours.</h1>
          <p>
            Your name helps distinguish this local TidyLine workspace. No account or
            online signup is needed.
          </p>
        </div>

        <form className="welcome-form" onSubmit={handleSubmit}>
          <label className="welcome-name-field">
            <span>Your name</span>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              maxLength="48"
              placeholder="What should we call this workspace?"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <fieldset className="welcome-accent-field">
            <legend>Choose an accent colour</legend>
            <div className="accent-choices" role="group" aria-label="Choose an accent colour">
              {ACCENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={accent === option.value ? 'accent-swatch active' : 'accent-swatch'}
                  style={{ background: option.value }}
                  onClick={() => onAccentChange(option.value)}
                  aria-pressed={accent === option.value}
                  aria-label={option.label}
                  title={option.label}
                />
              ))}
            </div>
          </fieldset>

          <div className="welcome-import">
            <div>
              <strong>Already have TidyLine data?</strong>
              <span>Import a previous JSON export before you start.</span>
            </div>
            <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              hidden
            />
          </div>
          {importMessage && <p className="welcome-import-message" role="status">{importMessage}</p>}

          <div className="welcome-actions">
            <button type="button" className="secondary" onClick={finishAsGuest}>
              Start as guest
            </button>
            <button type="submit" className="primary" disabled={!name.trim()}>
              Continue
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
