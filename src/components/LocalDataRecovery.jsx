/** Keep unreadable local task data intact until the user chooses what to do. */
export function LocalDataRecovery({ error, actionError, onDiscard, onGoogleSignIn }) {
  function downloadOriginal() {
    if (error.raw === null) return
    const url = URL.createObjectURL(new Blob([error.raw], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'tidyline-unreadable-tasks.json'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  function confirmDiscard() {
    if (window.confirm('Discard the unreadable task data stored in this browser? Download the original first if you may need it.')) {
      onDiscard()
    }
  }

  return (
    <main className="welcome-screen">
      <section className="welcome-card" aria-labelledby="recovery-title">
        <div className="welcome-copy">
          <h1 id="recovery-title">Your saved tasks need attention.</h1>
          <p>
            TidyLine could not safely read the tasks stored in this browser. The original
            data has been left untouched so it can be recovered.
          </p>
          <p role="alert">{error.message}</p>
          {actionError && <p role="alert">{actionError}</p>}
        </div>
        <div className="welcome-actions">
          <button type="button" className="primary" onClick={downloadOriginal} disabled={error.raw === null}>
            Download original data
          </button>
          {onGoogleSignIn && (
            <button type="button" className="secondary" onClick={onGoogleSignIn}>
              Sign in to your account
            </button>
          )}
          <button type="button" className="secondary danger" onClick={confirmDiscard}>
            Discard unreadable local data
          </button>
        </div>
      </section>
    </main>
  )
}
