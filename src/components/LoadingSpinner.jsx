/**
 * LoadingSpinner — shown while Supabase tasks/settings are being fetched
 * on initial load for authenticated users. Keeps the same dark/light theme
 * the user already has set via the CSS custom properties on <html>.
 */
export function LoadingSpinner() {
  return (
    <div className="loading-spinner-screen" role="status" aria-label="Loading your workspace…">
      <div className="loading-spinner-ring" aria-hidden="true">
        <div />
        <div />
        <div />
        <div />
      </div>
      <p className="loading-spinner-label">Loading your workspace…</p>
    </div>
  )
}
