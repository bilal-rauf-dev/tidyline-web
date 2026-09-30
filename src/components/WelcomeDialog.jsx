import { useRef, useState } from 'react'
import { parseImportedTasks } from '../utils/tasksIO'
import { BrandMonogram } from './BrandMonogram'
import { GoogleIcon } from './icons'
import { ImportReview } from './ImportReview'

export function WelcomeDialog({
  onImportTasks,
  onComplete,
  onGoogleSignIn,
  existingTaskCount = 0,
}) {
  const fileInputRef = useRef(null)
  const [importMessage, setImportMessage] = useState('')
  const [importPreview, setImportPreview] = useState(null)

  function finishAsGuest() {
    onComplete?.('', true)
  }

  function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const tasks = parseImportedTasks(String(reader.result))
        setImportPreview(tasks)
        setImportMessage('')
      } catch (error) {
        setImportPreview(null)
        setImportMessage(error instanceof Error ? error.message : 'That file is not a valid TidyLine export.')
      }
    }
    reader.onerror = () => setImportMessage('Could not read that file.')
    reader.readAsText(file)
    event.target.value = ''
  }

  function confirmImport() {
    if (!importPreview) return
    try {
      onImportTasks(importPreview)
      setImportMessage(`${importPreview.length} ${importPreview.length === 1 ? 'task' : 'tasks'} imported.`)
      setImportPreview(null)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Could not import those tasks.')
    }
  }

  return (
    <main className="welcome-screen">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-brand">
          <BrandMonogram size={30} />
          <span>TidyLine</span>
        </div>
        <div className="welcome-copy">
          <p className="welcome-kicker">Welcome to TidyLine</p>
          <h1 id="welcome-title">Make this space yours.</h1>
          <p>
            Sign in with Google to sync your tasks across devices, or start immediately as a guest.
          </p>
        </div>

        <div className="welcome-content">
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
          {importPreview && (
            <ImportReview
              tasks={importPreview}
              existingCount={existingTaskCount}
              onConfirm={confirmImport}
              onCancel={() => setImportPreview(null)}
            />
          )}

          <div className="welcome-actions">
            {onGoogleSignIn && (
              <button
                type="button"
                className="primary welcome-google-btn"
                onClick={onGoogleSignIn}
              >
                <GoogleIcon size={18} />
                <span>Sign in with Google</span>
              </button>
            )}
            <button type="button" className="secondary welcome-guest-btn" onClick={finishAsGuest}>
              Start as guest
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

