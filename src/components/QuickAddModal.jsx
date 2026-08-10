import { useEffect, useRef, useState } from 'react'
import { parseNaturalTask } from '../utils/parseNaturalTask'
import { toDateStr } from '../utils/calendar'
import { formatDate } from '../utils/dates'
import { tagTone } from '../utils/tags'
import { PlusIcon } from './icons'

export function QuickAddModal({ isOpen, onClose, onAddTask, onOpenFullForm }) {
  const inputRef = useRef(null)
  const [rawInput, setRawInput] = useState('')
  const [error, setError] = useState('')

  const parsed = parseNaturalTask(rawInput)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  if (!isOpen) return null

  function handleRemoveToken(token, event) {
    event.stopPropagation()
    const start = rawInput.indexOf(token.text)
    if (start !== -1) {
      const nextInput = rawInput.slice(0, start) + rawInput.slice(start + token.text.length)
      setRawInput(nextInput)
    }
    inputRef.current?.focus()
  }

  function handleEditToken(token) {
    const start = rawInput.indexOf(token.text)
    if (start !== -1 && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.setSelectionRange(start, start + token.text.length)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()

      if (event.shiftKey) {
        onOpenFullForm(parsed, rawInput)
        onClose()
        return
      }

      if (!parsed.title.trim()) {
        setError('Task title cannot be empty.')
        return
      }

      if (!parsed.deadline) {
        setError('Please specify a valid deadline.')
        return
      }

      const todayStr = toDateStr(new Date())
      const deadlineStr = toDateStr(parsed.deadline)
      if (deadlineStr < todayStr) {
        setError('Deadline cannot be in the past.')
        return
      }

      onAddTask({
        title: parsed.title,
        deadline: deadlineStr,
        tags: parsed.tags,
        reminders: [],
        recurrence: null,
        notes: '',
        checklist: [],
        links: [],
        attachments: [],
        location: '',
        duration: null,
        startDate: null,
        energyLevel: null,
        status: 'active',
        waitingFor: '',
        followUpDate: null,
      })

      onClose()
    }
  }

  const deadlineToken = parsed.matchedTokens.find((t) => t.type === 'deadline')
  const tagTokens = parsed.matchedTokens.filter((t) => t.type === 'tag')

  return (
    <div className="palette-layer" role="dialog" aria-modal="true" aria-label="Quick Add Task">
      <button type="button" className="palette-scrim" aria-label="Close" onClick={onClose} />
      <div className="palette quick-add-palette">
        <div className="palette-search">
          <PlusIcon />
          <input
            ref={inputRef}
            type="text"
            value={rawInput}
            placeholder="Finish DB assignment tomorrow 8pm #university"
            aria-label="Quick add input"
            onChange={(e) => {
              setRawInput(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="quick-add-body">
          {parsed.matchedTokens.length > 0 && (
            <div className="quick-add-chips-container">
              <span className="quick-add-chips-label">Detected:</span>
              <ul className="tag-list quick-add-chips">
                {deadlineToken && (
                  <li
                    className="tag tag-accent quick-add-chip"
                    onClick={() => handleEditToken(deadlineToken)}
                    title="Click to edit deadline"
                  >
                    <span>{formatDate(toDateStr(deadlineToken.value))}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveToken(deadlineToken, e)}
                      aria-label="Remove deadline"
                    >
                      &times;
                    </button>
                  </li>
                )}
                {tagTokens.map((t, idx) => (
                  <li
                    key={idx}
                    className={`tag tag-${tagTone(t.value)} quick-add-chip`}
                    onClick={() => handleEditToken(t)}
                    title="Click to edit tag"
                  >
                    <span>#{t.value}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveToken(t, e)}
                      aria-label={`Remove tag ${t.value}`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.deadline && (
            <div className="quick-add-interpretation">
              <span className="interpretation-label">Interpretation:</span>
              <span className="interpretation-text">
                Deadline:{' '}
                <strong>
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(parsed.deadline)}
                </strong>
              </span>
            </div>
          )}

          {error && (
            <p className="field-error quick-add-error" role="alert">
              {error}
            </p>
          )}

          <div className="quick-add-hints">
            <span>
              Press <strong>Enter</strong> to save · <strong>Shift+Enter</strong> for full form ·{' '}
              <strong>Esc</strong> to cancel
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
