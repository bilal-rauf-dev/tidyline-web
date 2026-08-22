import { useEffect, useRef, useState } from 'react'
import { advanceRoutine, getRoutineStep } from '../utils/routineIO'

function stepLines(routine) {
  return routine.steps.map((step) => step.text).join('\n')
}

export function RoutinesPage({ routines, dataError, onAdd, onUpdate, onDelete }) {
  const [activeRoutineId, setActiveRoutineId] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [editorMode, setEditorMode] = useState(null)
  const [title, setTitle] = useState('')
  const [actions, setActions] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const advanceRef = useRef(null)
  const activeRoutine = routines.find((routine) => routine.id === activeRoutineId) ?? null
  const currentStep = getRoutineStep(activeRoutine, stepIndex)

  useEffect(() => {
    if (currentStep) advanceRef.current?.focus()
  }, [currentStep])

  function openCreate() {
    setEditorMode('new')
    setTitle('')
    setActions('')
    setFormError('')
  }

  function openEdit(routine) {
    setEditorMode(routine.id)
    setTitle(routine.title)
    setActions(stepLines(routine))
    setFormError('')
  }

  function closeEditor() {
    setEditorMode(null)
    setFormError('')
  }

  function saveRoutine(event) {
    event.preventDefault()
    const actionLines = actions
      .split(/\r?\n/)
      .map((text) => text.trim())
      .filter(Boolean)

    if (!title.trim()) {
      setFormError('Give this routine a short name.')
      return
    }
    if (!actionLines.length) {
      setFormError('Add at least one action, one per line.')
      return
    }
    if (actionLines.length > 50) {
      setFormError('Keep this routine to 50 actions or fewer.')
      return
    }

    const steps = actionLines.map((text) => ({ text }))

    if (editorMode === 'new') onAdd({ title, steps })
    else onUpdate(editorMode, { title, steps })
    setNotice(editorMode === 'new' ? 'Routine saved.' : 'Routine updated.')
    closeEditor()
  }

  function runRoutine(routine) {
    if (!routine.steps.length) return
    setNotice('')
    setStepIndex(0)
    setActiveRoutineId(routine.id)
  }

  function finishStep() {
    const result = advanceRoutine(activeRoutine, stepIndex)
    if (result.complete) {
      setActiveRoutineId(null)
      setStepIndex(0)
      setNotice(`${activeRoutine.title} complete.`)
      return
    }
    setStepIndex(result.stepIndex)
  }

  if (activeRoutine && currentStep) {
    const isLast = stepIndex === activeRoutine.steps.length - 1
    return (
      <main className="app-shell routine-runner-shell">
        <header className="hero routine-runner-hero">
          <span className="welcome-kicker">Routine running</span>
          <h1>{activeRoutine.title}</h1>
          <p className="hero-copy">Only this action matters right now.</p>
        </header>

        <section className="entry-card routine-step-card" aria-labelledby="routine-step-title">
          <span className="home-feature-kicker">Step {stepIndex + 1} of {activeRoutine.steps.length}</span>
          <h2 id="routine-step-title">{currentStep.text}</h2>
          <div className="routine-run-actions">
            <button ref={advanceRef} type="button" className="primary" onClick={finishStep}>
              {isLast ? 'Finish routine' : 'Done — next action'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setActiveRoutineId(null)
                setStepIndex(0)
              }}
            >
              Stop routine
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell routines-shell">
      <header className="hero routines-hero">
        <div>
          <h1>Routines</h1>
          <p className="hero-copy">Save a short sequence once, then follow one action at a time.</p>
        </div>
        {!editorMode && <button type="button" className="primary" onClick={openCreate}>New routine</button>}
      </header>

      {dataError && <p className="data-error" role="alert">{dataError}</p>}
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>

      {editorMode && (
        <section className="entry-card routine-editor" aria-labelledby="routine-editor-title">
          <h2 id="routine-editor-title">{editorMode === 'new' ? 'New routine' : 'Edit routine'}</h2>
          <form onSubmit={saveRoutine}>
            <label>
              <span>Routine name</span>
              <input
                autoFocus
                maxLength="80"
                placeholder="Leaving the house"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              <span>Actions, in order</span>
              <textarea
                rows="7"
                placeholder={'Pick up keys\nPut on shoes\nCheck the door'}
                value={actions}
                onChange={(event) => setActions(event.target.value)}
              />
              <small>One concrete action per line. Up to 50 actions are kept.</small>
            </label>
            {formError && <p className="routine-form-error" role="alert">{formError}</p>}
            <div className="routine-editor-actions">
              <button type="submit" className="primary">Save routine</button>
              <button type="button" className="secondary" onClick={closeEditor}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {!routines.length && !editorMode ? (
        <section className="entry-card routines-empty">
          <span className="home-feature-kicker">No setup required</span>
          <h2>Save only a sequence you repeat.</h2>
          <p>Good examples are leaving home, starting work, or closing down for the day.</p>
          <button type="button" className="primary" onClick={openCreate}>Create a routine</button>
        </section>
      ) : (
        <div className="routine-grid" aria-label="Saved routines">
          {routines.map((routine) => (
            <article key={routine.id} className="entry-card routine-card">
              <div>
                <span className="home-feature-kicker">{routine.steps.length} {routine.steps.length === 1 ? 'action' : 'actions'}</span>
                <h2>{routine.title}</h2>
              </div>
              <div className="routine-card-actions">
                <button type="button" className="primary" disabled={!routine.steps.length} onClick={() => runRoutine(routine)}>Run routine</button>
                <button type="button" className="secondary" onClick={() => openEdit(routine)}>Edit</button>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    if (window.confirm(`Delete “${routine.title}”?`)) onDelete(routine.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
