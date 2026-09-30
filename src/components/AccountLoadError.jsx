export function AccountLoadError({ onRetry, onSignOut }) {
  return (
    <main className="welcome-screen">
      <section className="welcome-card" aria-labelledby="account-load-error-title">
        <div className="welcome-copy">
          <h1 id="account-load-error-title">Your account tasks could not load.</h1>
          <p>
            TidyLine could not reach your account, and this browser has no saved account copy.
            Check your connection and try again before editing tasks.
          </p>
        </div>
        <div className="welcome-actions">
          <button type="button" className="primary" onClick={onRetry}>Retry loading tasks</button>
          <button type="button" className="secondary" onClick={onSignOut}>Sign out</button>
        </div>
      </section>
    </main>
  )
}
