import { useState } from 'react'
import { parseTags } from '../utils/tags'
import { TagList } from '../components/TagList'

function SomedayCard({ task, onPromote, onDelete, onUpdate }) {
  const [deadline, setDeadline] = useState('')

  return (
    <li className="someday-card" data-task-id={task.id}>
      <div className="someday-card-head">
        <strong>{task.title}</strong>
        <button type="button" className="secondary danger" onClick={() => onDelete(task.id)}>
          Delete
        </button>
      </div>
      <textarea
        rows="3"
        value={task.notes}
        placeholder="Shape the idea when it becomes clearer"
        onChange={(event) => onUpdate(task.id, { notes: event.target.value })}
      />
      <TagList tags={task.tags} />
      <div className="someday-promote">
        <label className="field-icon">
          <span className="field-icon-head">Promote with deadline</span>
          <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
        </label>
        <button
          type="button"
          className="primary"
          disabled={!deadline}
          onClick={() => onPromote(task.id, deadline)}
        >
          Move to Board
        </button>
      </div>
    </li>
  )
}

export function SomedayPage({ tasks, addSomedayTask, promoteSomeday, deleteTask, updateTask }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const ideas = tasks.filter((task) => !task.deadline && !task.archived)

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return
    addSomedayTask({ title: title.trim(), notes, tags: parseTags(tags) })
    setTitle('')
    setNotes('')
    setTags('')
  }

  return (
    <main className="app-shell someday-shell">
      <header className="hero">
        <h1>Someday / Maybe</h1>
        <p className="hero-copy">
          Keep ideas without inventing a deadline. Promote one when it becomes real work.
        </p>
      </header>

      <section className="entry-card someday-entry">
        <h2>Capture an idea</h2>
        <form onSubmit={submit}>
          <div className="field-underline">
            <input
              type="text"
              className="input-underline"
              value={title}
              placeholder="Something worth revisiting"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <textarea
            rows="3"
            value={notes}
            placeholder="Notes"
            onChange={(event) => setNotes(event.target.value)}
          />
          <label className="field-icon">
            <span className="field-icon-head">Tags</span>
            <input
              type="text"
              value={tags}
              placeholder="idea, reading"
              onChange={(event) => setTags(event.target.value)}
            />
          </label>
          <button type="submit" className="primary">Save idea</button>
        </form>
      </section>

      <section className="someday-list-section">
        <div className="someday-list-head">
          <h2>Holding area</h2>
          <span>{ideas.length}</span>
        </div>
        {ideas.length === 0 ? (
          <p className="empty">No ideas parked here.</p>
        ) : (
          <ul className="someday-list">
            {ideas.map((task) => (
              <SomedayCard
                key={task.id}
                task={task}
                onPromote={promoteSomeday}
                onDelete={deleteTask}
                onUpdate={updateTask}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
