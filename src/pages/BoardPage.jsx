import { useMemo } from 'react'
import { useSearch } from 'wouter'
import { BUCKET_LABELS, BUCKET_ORDER, groupTasksByBucket } from '../utils/buckets'
import { TaskForm } from '../components/TaskForm'
import { BucketColumn } from '../components/BucketColumn'

export function BoardPage({ tasks, addTask, updateTask, deleteTask, toggleTask, addReminder, removeReminder }) {
  const search = useSearch()
  const buckets = useMemo(() => groupTasksByBucket(tasks), [tasks])
  const focusForm = new URLSearchParams(search).get('add') === '1'

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Reminder board</h1>
        <p className="hero-copy">
          Add a task, set its due date, attach one or more reminders, and it
          lands automatically in the right time bucket.
        </p>
      </header>

      <TaskForm onAddTask={addTask} focusOnMount={focusForm} />

      <section className="buckets" aria-label="Task buckets">
        {BUCKET_ORDER.map((bucket) => (
          <BucketColumn
            key={bucket}
            bucketKey={bucket}
            label={BUCKET_LABELS[bucket]}
            tasks={buckets[bucket]}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onUpdate={updateTask}
            onAddReminder={addReminder}
            onRemoveReminder={removeReminder}
          />
        ))}
      </section>
    </main>
  )
}
