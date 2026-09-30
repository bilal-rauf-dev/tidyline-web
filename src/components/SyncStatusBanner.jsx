export function SyncStatusBanner({
  count,
  syncing,
  failed,
  conflictCount = 0,
  onRetry,
  onDismissConflicts,
}) {
  if (count === 0 && conflictCount === 0) return null

  return (
    <div className="sync-status-banner" role={conflictCount > 0 ? 'alert' : 'status'}>
      <span>
        {conflictCount > 0 && (
          <>
            {conflictCount} conflicting {conflictCount === 1 ? 'change was' : 'changes were'} found.
            {' '}The newer account version was kept. Any local edit is available as a labelled “conflict copy.”{' '}
          </>
        )}
        {count > 0 && (
          <>
            {count} {count === 1 ? 'change' : 'changes'} saved in this browser.
            {' '}{syncing ? 'Syncing with your account…' : failed ? 'Account sync is paused.' : 'Waiting to sync.'}
          </>
        )}
      </span>
      {conflictCount > 0 && (
        <button type="button" className="secondary" onClick={onDismissConflicts}>Dismiss</button>
      )}
      {count > 0 && !syncing && (
        <button type="button" className="secondary" onClick={onRetry}>Retry sync</button>
      )}
    </div>
  )
}
