/**
 * MigrationBanner
 *
 * Shown (non-blocking) when a signed-in user has local task/settings data
 * that hasn't been imported to their Supabase account yet.
 * Disappears after the user imports or dismisses.
 */
export function MigrationBanner({
  taskCount = 0,
  accountTaskCount = 0,
  hasSettings = false,
  onMigrate,
  onDismiss,
  busy = false,
}) {
  const parts = []
  if (taskCount > 0)  parts.push(`${taskCount} task${taskCount === 1 ? '' : 's'}`)
  if (hasSettings)    parts.push('settings')
  const what = parts.join(' and ')

  return (
    <div className="migration-banner" role="alert">
      <span className="migration-banner-icon" aria-hidden="true">📦</span>
      <p className="migration-banner-text">
        You have <strong>{what}</strong> saved locally from before signing in.
        {taskCount > 0 && ` Your account currently has ${accountTaskCount} ${accountTaskCount === 1 ? 'task' : 'tasks'}.`}
        {' '}Merge {parts.length > 1 ? 'them' : 'it'} into your account?
        {taskCount > 0 && ' Existing account tasks stay; a different local task with the same ID becomes a separate copy.'}
      </p>
      <div className="migration-banner-actions">
        <button
          type="button"
          className="primary migration-banner-import"
          onClick={onMigrate}
          disabled={busy}
        >
          {busy ? 'Merging…' : 'Merge into account'}
        </button>
        <button
          type="button"
          className="secondary migration-banner-dismiss"
          onClick={onDismiss}
          disabled={busy}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
