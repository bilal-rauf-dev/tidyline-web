export function OfflineBanner({ isAuthenticated }) {
  return (
    <div className="offline-banner" role="status">
      You appear offline.
      {' '}Keep this page open; reloading may need a connection.
      {' '}{isAuthenticated ? 'Task changes will sync when your connection returns.' : 'Guest tasks stay in this browser.'}
    </div>
  )
}
