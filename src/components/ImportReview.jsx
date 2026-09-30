export function ImportReview({ tasks, existingCount, onConfirm, onCancel }) {
  return (
    <div className="import-review" role="region" aria-label="Review task import">
      <h3>Review import</h3>
      <p>
        This file contains {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}.
        Confirming will replace {existingCount} {existingCount === 1 ? 'existing task' : 'existing tasks'}
        {' '}in this workspace.
      </p>
      {tasks.length > 0 && (
        <ul>
          {tasks.slice(0, 5).map((task) => <li key={task.id}>{task.title}</li>)}
        </ul>
      )}
      {tasks.length > 5 && <p>And {tasks.length - 5} more.</p>}
      <div className="import-review-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary" onClick={onConfirm}>Replace tasks</button>
      </div>
    </div>
  )
}
