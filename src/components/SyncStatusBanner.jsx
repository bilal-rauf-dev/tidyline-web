export function SyncStatusBanner({ count, syncing, failed, onRetry }) {
  if (count === 0) return null

  return (
    <div className="sync-status-banner" role="status">
      <span>
        {count} {count === 1 ? 'change' : 'changes'} saved in this browser.
        {' '}{syncing ? 'Syncing with your account…' : failed ? 'Account sync is paused.' : 'Waiting to sync.'}
      </span>
      {!syncing && <button type="button" className="secondary" onClick={onRetry}>Retry sync</button>}
    </div>
  )
}
