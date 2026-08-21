import { useEffect, useMemo, useRef, useState } from 'react'
import { parseNaturalTask } from '../utils/parseNaturalTask'
import { toDateStr } from '../utils/calendar'
import { formatDate } from '../utils/dates'
import { collectTags, tagTone } from '../utils/tags'
import { describeRecurrence } from '../utils/recurrence'
import { PlusIcon } from './icons'

const EXAMPLE_HINTS = ['tomorrow 8pm', 'for 2h', 'remind 1h before', 'every weekday', '#tag']

function formatMinutes(minutes) {
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes}m`
}

function toLocalDate(date) {
  return date ? toDateStr(date) : null
}

export function QuickAddModal({ isOpen, onClose, onAddTask, onOpenFullForm, tasks = [] }) {
  const inputRef = useRef(null)
  const [rawInput, setRawInput] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const parsed = parseNaturalTask(rawInput)

  const suggestions = useMemo(() => {
    const hashMatch = /#(\w*)$/.exec(rawInput)
    if (!hashMatch) return []
    const partial = hashMatch[1].toLowerCase()
    return collectTags(tasks)
      .filter((tag) => tag.startsWith(partial) && tag !== partial)
      .slice(0, 6)
      .map((tag) => ({ label: `#${tag}`, replace: hashMatch[0], with: `#${tag}` }))
  }, [rawInput, tasks])

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [])

  if (!isOpen) return null

  function applySuggestion(suggestion) {
    setRawInput(
      rawInput.slice(0, rawInput.lastIndexOf(suggestion.replace)) + suggestion.with,
    )
    setActiveSuggestion(-1)
    inputRef.current?.focus()
  }

  function removeToken(token, event) {
    event.stopPropagation()
    const start = rawInput.indexOf(token.text)
    if (start >= 0) {
      setRawInput(rawInput.slice(0, start) + rawInput.slice(start + token.text.length))
    }
  }

  function editToken(token) {
    const start = rawInput.indexOf(token.text)
    if (start >= 0) {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(start, start + token.text.length)
    }
  }

  function submit() {
    if (!parsed.title.trim()) {
      setSubmitError('Task title cannot be empty.')
      return
    }
    if (!parsed.deadline) {
      setSubmitError('Add a deadline in natural language, such as “Friday” or “tomorrow”.')
      return
    }

    const deadline = toLocalDate(parsed.deadline)
    if (deadline < toDateStr(new Date())) {
      setSubmitError('Deadline cannot be in the past.')
      return
    }
    if (parsed.durationMinutes !== null && parsed.durationMinutes <= 0) {
      setSubmitError('Duration must be greater than zero.')
      return
    }
    if (parsed.reminderMinutes !== null && parsed.reminderMinutes <= 0) {
      setSubmitError('Reminder must be before the deadline.')
      return
    }

    onAddTask({
      title: parsed.title,
      deadline,
      tags: parsed.tags,
      reminders:
        parsed.reminderMinutes === null
          ? []
          : [{
              id: `rel:${parsed.reminderMinutes}`,
              kind: 'relative',
              minutesBefore: parsed.reminderMinutes,
            }],
      recurrence: parsed.recurrence,
      duration:
        parsed.durationMinutes === null
          ? null
          : { value: parsed.durationMinutes, unit: 'min' },
    })
    onClose()
  }

  function handleKeyDown(event) {
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveSuggestion((index) => Math.min(index + 1, suggestions.length - 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveSuggestion((index) => Math.max(index - 1, -1))
        return
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && activeSuggestion >= 0) {
        event.preventDefault()
        applySuggestion(suggestions[activeSuggestion])
        return
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) {
        onOpenFullForm(parsed)
        onClose()
      } else {
        submit()
      }
    }
  }

  const deadlineToken = parsed.matchedTokens.find((token) => token.type === 'deadline')
  const recurrenceToken = parsed.matchedTokens.find((token) => token.type === 'recurrence')
  const reminderToken = parsed.matchedTokens.find((token) => token.type === 'reminder')
  const durationToken = parsed.matchedTokens.find((token) => token.type === 'duration')
  const tagTokens = parsed.matchedTokens.filter((token) => token.type === 'tag')
  const chips = [deadlineToken, recurrenceToken, reminderToken, durationToken, ...tagTokens].filter(Boolean)

  return (
    <div className="palette-layer" role="dialog" aria-modal="true" aria-label="Quick add task">
      <button type="button" className="palette-scrim" aria-label="Close" onClick={onClose} />
      <div className="palette quick-add-palette">
        <div className="palette-search">
          <PlusIcon />
          <input
            ref={inputRef}
            type="text"
            value={rawInput}
            placeholder="Submit assignment Friday for 2h #university"
            aria-label="Quick add task"
            aria-autocomplete="list"
            aria-controls={suggestions.length ? 'quick-add-suggestions' : undefined}
            onChange={(event) => {
              setRawInput(event.target.value)
              setSubmitError('')
              setActiveSuggestion(-1)
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd>Esc</kbd>
        </div>

        {suggestions.length > 0 && (
          <ul id="quick-add-suggestions" className="quick-add-suggestions" role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.label}
                role="option"
                aria-selected={index === activeSuggestion}
                className={index === activeSuggestion ? 'quick-add-suggestion is-active' : 'quick-add-suggestion'}
                onMouseDown={(event) => {
                  event.preventDefault()
                  applySuggestion(suggestion)
                }}
              >
                {suggestion.label}
              </li>
            ))}
          </ul>
        )}

        <div className="quick-add-body">
          {chips.length > 0 && (
            <div className="quick-add-chips-container">
              <span className="quick-add-chips-label">Understood</span>
              <ul className="tag-list quick-add-chips">
                {deadlineToken && (
                  <li className="tag tag-accent quick-add-chip" onClick={() => editToken(deadlineToken)}>
                    <span>{formatDate(toLocalDate(deadlineToken.value))}</span>
                    <button type="button" onClick={(event) => removeToken(deadlineToken, event)} aria-label="Remove deadline">×</button>
                  </li>
                )}
                {durationToken && (
                  <li className="tag tag-neutral quick-add-chip" onClick={() => editToken(durationToken)}>
                    <span>{formatMinutes(parsed.durationMinutes)}</span>
                    <button type="button" onClick={(event) => removeToken(durationToken, event)} aria-label="Remove duration">×</button>
                  </li>
                )}
                {reminderToken && (
                  <li className="tag tag-lavender quick-add-chip" onClick={() => editToken(reminderToken)}>
                    <span>{formatMinutes(parsed.reminderMinutes)} before</span>
                    <button type="button" onClick={(event) => removeToken(reminderToken, event)} aria-label="Remove reminder">×</button>
                  </li>
                )}
                {recurrenceToken && (
                  <li className="tag tag-lavender quick-add-chip" onClick={() => editToken(recurrenceToken)}>
                    <span>{describeRecurrence(parsed.recurrence)}</span>
                    <button type="button" onClick={(event) => removeToken(recurrenceToken, event)} aria-label="Remove recurrence">×</button>
                  </li>
                )}
                {tagTokens.map((token) => (
                  <li key={token.text} className={`tag ${tagTone(token.value)} quick-add-chip`} onClick={() => editToken(token)}>
                    <span>#{token.value}</span>
                    <button type="button" onClick={(event) => removeToken(token, event)} aria-label={`Remove tag ${token.value}`}>×</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!rawInput.trim() && (
            <div className="quick-add-hints">
              <span>Try</span>
              {EXAMPLE_HINTS.map((hint) => <code key={hint}>{hint}</code>)}
            </div>
          )}
          {submitError && <p className="quick-add-error" role="alert">{submitError}</p>}
        </div>

        <div className="palette-footer quick-add-footer">
          <span><kbd>Enter</kbd> add</span>
          <span><kbd>Shift</kbd> + <kbd>Enter</kbd> open details</span>
        </div>
      </div>
    </div>
  )
}
