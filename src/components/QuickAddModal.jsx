import { useEffect, useRef, useState, useMemo } from 'react'
import { parseNaturalTask } from '../utils/parseNaturalTask'
import { toDateStr } from '../utils/calendar'
import { formatDate, deadlineMoment } from '../utils/dates'
import { tagTone, collectTags } from '../utils/tags'
import { describeRecurrence } from '../utils/recurrence'
import { PlusIcon } from './icons'
import { buildQuickAddTask, toLocalYMD } from '../utils/quickAddTask'

const PRIORITY_LABELS = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
}

const EXAMPLE_HINTS = [
  'tomorrow 8pm',
  'remind 1h before',
  'for 2h',
  'every weekday',
  '!high',
  '#tag',
  'plan today',
  'start Monday',
]

function formatMinutes(mins) {
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

function getValidationWarnings(parsed) {
  const warnings = []

  if (parsed.reminderMinutes !== null && parsed.deadline) {
    const deadlineMs = deadlineMoment(toDateStr(parsed.deadline)).getTime()
    const reminderMs = deadlineMs - parsed.reminderMinutes * 60 * 1000
    if (reminderMs >= deadlineMs) {
      warnings.push({ field: 'reminder', message: 'Reminder must be before the deadline.' })
    }
  }

  if (parsed.reminderMinutes !== null && !parsed.deadline) {
    warnings.push({ field: 'reminder', message: 'Reminder requires a deadline to calculate from.' })
  }

  if (parsed.durationMinutes !== null && parsed.durationMinutes <= 0) {
    warnings.push({ field: 'duration', message: 'Duration must be greater than zero.' })
  }

  return warnings
}

export function QuickAddModal({ isOpen, onClose, onAddTask, onOpenFullForm, tasks = [] }) {
  const inputRef = useRef(null)
  const [rawInput, setRawInput] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [activeHintIndex, setActiveHintIndex] = useState(-1)

  const parsed = parseNaturalTask(rawInput)
  const warnings = getValidationWarnings(parsed)
  const warningFields = new Set(warnings.map((w) => w.field))

  // Autocomplete suggestions: tag completions after "#" or static example hints
  const suggestions = useMemo(() => {
    // Tag completion: "#uni" → show matching known tags
    const hashMatch = /#(\w*)$/.exec(rawInput)
    if (hashMatch) {
      const partial = hashMatch[1].toLowerCase()
      const knownTags = collectTags(tasks)
      return knownTags
        .filter((t) => t.startsWith(partial) && t !== partial)
        .slice(0, 6)
        .map((t) => ({ label: `#${t}`, replace: hashMatch[0], with: `#${t}` }))
    }
    return []
  }, [rawInput, tasks])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  if (!isOpen) return null

  function applySuggestion(suggestion) {
    const newInput = rawInput.slice(0, rawInput.lastIndexOf(suggestion.replace)) + suggestion.with
    setRawInput(newInput)
    setActiveHintIndex(-1)
    inputRef.current?.focus()
  }

  function handleRemoveToken(token, event) {
    event.stopPropagation()
    const start = rawInput.indexOf(token.text)
    if (start !== -1) {
      setRawInput(rawInput.slice(0, start) + rawInput.slice(start + token.text.length))
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
    // Navigate autocomplete with arrow keys
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveHintIndex((i) => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveHintIndex((i) => Math.max(i - 1, -1))
        return
      }
      if ((event.key === 'Tab' || event.key === 'Enter') && activeHintIndex >= 0) {
        event.preventDefault()
        applySuggestion(suggestions[activeHintIndex])
        return
      }
      if (event.key === 'Tab' && suggestions.length === 1) {
        event.preventDefault()
        applySuggestion(suggestions[0])
        return
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()

      if (event.shiftKey) {
        onOpenFullForm(parsed)
        onClose()
        return
      }

      if (!parsed.title.trim()) {
        setSubmitError('Task title cannot be empty.')
        return
      }

      const todayStr = toDateStr(new Date())
      const deadlineStr = parsed.deadline ? toLocalYMD(parsed.deadline) : null
      if (deadlineStr && deadlineStr < todayStr) {
        setSubmitError('Deadline cannot be in the past.')
        return
      }

      if (warnings.length > 0) {
        setSubmitError(warnings[0].message)
        return
      }

      onAddTask(buildQuickAddTask(parsed, new Date()))

      onClose()
    }
  }

  const deadlineToken = parsed.matchedTokens.find((t) => t.type === 'deadline')
  const startDateToken = parsed.matchedTokens.find((t) => t.type === 'startDate')
  const recurrenceToken = parsed.matchedTokens.find((t) => t.type === 'recurrence')
  const tagTokens = parsed.matchedTokens.filter((t) => t.type === 'tag')
  const priorityToken = parsed.matchedTokens.find((t) => t.type === 'priority')
  const durationToken = parsed.matchedTokens.find((t) => t.type === 'duration')
  const reminderToken = parsed.matchedTokens.find((t) => t.type === 'reminder')
  const planTodayToken = parsed.matchedTokens.find((t) => t.type === 'planForToday')

  const hasChips =
    deadlineToken ||
    startDateToken ||
    recurrenceToken ||
    tagTokens.length > 0 ||
    priorityToken ||
    durationToken ||
    reminderToken ||
    planTodayToken

  const todayStr = toDateStr(new Date())

  return (
    <div className="palette-layer" role="dialog" aria-modal="true" aria-label="Quick Add Task">
      <button type="button" className="palette-scrim" aria-label="Close" onClick={onClose} />
      <div className="palette quick-add-palette">
        <div className="palette-search">
          <PlusIcon />
          <input
            ref={inputRef}
            id="quick-add-input"
            type="text"
            value={rawInput}
            placeholder="Finish DB assignment tomorrow 8pm for 2h !high #university"
            aria-label="Quick add task"
            aria-autocomplete="list"
            aria-controls={suggestions.length > 0 ? 'quick-add-suggestions' : undefined}
            onChange={(e) => {
              setRawInput(e.target.value)
              setSubmitError('')
              setActiveHintIndex(-1)
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd>Esc</kbd>
        </div>

        {/* Tag autocomplete dropdown */}
        {suggestions.length > 0 && (
          <ul
            id="quick-add-suggestions"
            role="listbox"
            aria-label="Tag suggestions"
            className="quick-add-suggestions"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.label}
                role="option"
                aria-selected={i === activeHintIndex}
                className={`quick-add-suggestion${i === activeHintIndex ? ' is-active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  applySuggestion(s)
                }}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}

        <div className="quick-add-body">
          {hasChips && (
            <div className="quick-add-chips-container">
              <span className="quick-add-chips-label">Detected:</span>
              <ul className="tag-list quick-add-chips">
                {deadlineToken && (
                  <li
                    className="tag tag-accent quick-add-chip"
                    onClick={() => handleEditToken(deadlineToken)}
                    title="Click to edit deadline"
                  >
                    <span>{formatDate(toLocalYMD(deadlineToken.value))}</span>
                    <button type="button" onClick={(e) => handleRemoveToken(deadlineToken, e)} aria-label="Remove deadline">&times;</button>
                  </li>
                )}

                {startDateToken && (
                  <li
                    className="tag tag-neutral quick-add-chip"
                    onClick={() => handleEditToken(startDateToken)}
                    title="Click to edit start date"
                  >
                    <span>Start {formatDate(toLocalYMD(startDateToken.value))}</span>
                    <button type="button" onClick={(e) => handleRemoveToken(startDateToken, e)} aria-label="Remove start date">&times;</button>
                  </li>
                )}

                {recurrenceToken && (
                  <li
                    className="tag tag-lavender quick-add-chip"
                    onClick={() => handleEditToken(recurrenceToken)}
                    title="Click to edit recurrence"
                  >
                    <span>{describeRecurrence(recurrenceToken.value)}</span>
                    <button type="button" onClick={(e) => handleRemoveToken(recurrenceToken, e)} aria-label="Remove recurrence">&times;</button>
                  </li>
                )}

                {reminderToken && (
                  <li
                    className={`tag ${warningFields.has('reminder') ? 'tag-warning' : 'tag-lavender'} quick-add-chip`}
                    onClick={() => handleEditToken(reminderToken)}
                    title={warningFields.has('reminder') ? warnings.find((w) => w.field === 'reminder')?.message : 'Click to edit reminder'}
                  >
                    <span>{warningFields.has('reminder') ? '⚠ ' : ''}{formatMinutes(parsed.reminderMinutes)} before</span>
                    <button type="button" onClick={(e) => handleRemoveToken(reminderToken, e)} aria-label="Remove reminder">&times;</button>
                  </li>
                )}

                {durationToken && (
                  <li
                    className={`tag ${warningFields.has('duration') ? 'tag-warning' : 'tag-neutral'} quick-add-chip`}
                    onClick={() => handleEditToken(durationToken)}
                    title="Click to edit duration"
                  >
                    <span>{formatMinutes(parsed.durationMinutes)}</span>
                    <button type="button" onClick={(e) => handleRemoveToken(durationToken, e)} aria-label="Remove duration">&times;</button>
                  </li>
                )}

                {priorityToken && (
                  <li
                    className="tag tag-accent quick-add-chip"
                    onClick={() => handleEditToken(priorityToken)}
                    title="Click to edit priority"
                  >
                    <span>{PRIORITY_LABELS[parsed.priority] ?? parsed.priority}</span>
                    <button type="button" onClick={(e) => handleRemoveToken(priorityToken, e)} aria-label="Remove priority">&times;</button>
                  </li>
                )}

                {planTodayToken && (
                  <li
                    className="tag tag-accent quick-add-chip"
                    onClick={() => handleEditToken(planTodayToken)}
                    title="Remove plan-for-today flag"
                  >
                    <span>Plan today</span>
                    <button type="button" onClick={(e) => handleRemoveToken(planTodayToken, e)} aria-label="Remove plan for today">&times;</button>
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
                    <button type="button" onClick={(e) => handleRemoveToken(t, e)} aria-label={`Remove tag ${t.value}`}>&times;</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <ul className="quick-add-warnings">
              {warnings.map((w, i) => (
                <li key={i} className="quick-add-warning" role="alert">{w.message}</li>
              ))}
            </ul>
          )}

          {parsed.deadline && (
            <div className="quick-add-interpretation">
              <span className="interpretation-text">
                Deadline:{' '}
                <strong>
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  }).format(parsed.deadline)}
                </strong>
                {toLocalYMD(parsed.deadline) === todayStr && <span className="interp-badge">today</span>}
              </span>
            </div>
          )}

          {submitError && (
            <p className="field-error quick-add-error" role="alert">{submitError}</p>
          )}

          <div className="quick-add-hints">
            <span className="quick-add-syntax">
              {EXAMPLE_HINTS.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  className="quick-add-hint-pill"
                  tabIndex={-1}
                  onClick={() => {
                    const sep = rawInput.length && !rawInput.endsWith(' ') ? ' ' : ''
                    setRawInput(rawInput + sep + hint + ' ')
                    inputRef.current?.focus()
                  }}
                >
                  {hint}
                </button>
              ))}
            </span>
            <span>
              <strong>Enter</strong> to save · <strong>Shift+Enter</strong> full form ·{' '}
              <strong>Esc</strong> cancel
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
