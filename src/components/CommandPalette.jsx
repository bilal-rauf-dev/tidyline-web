import { useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyFilter } from '../utils/fuzzy'
import { SearchIcon } from './icons'

export function CommandPalette({ commands, targetLabel = '', onClose }) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [valueCommand, setValueCommand] = useState(null)
  const [value, setValue] = useState('')

  const results = useMemo(
    () => (query ? fuzzyFilter(commands, query, (command) => command.label) : commands),
    [commands, query],
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function updateQuery(value) {
    setQuery(value)
    setActiveIndex(0)
  }

  function run(command) {
    if (!command || command.disabled) return
    if (command.acceptsValue) {
      setValueCommand(command)
      setValue('')
      return
    }
    onClose()
    command.run()
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (valueCommand) {
        if (value.trim()) { valueCommand.runWithValue(value); onClose() }
      } else run(results[activeIndex])
    }
  }

  return (
    <div className="palette-layer" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" className="palette-scrim" aria-label="Close command palette" onClick={onClose} />

      <div className="palette">
        {targetLabel && <p className="palette-target">Target: <strong>{targetLabel}</strong></p>}
        <div className="palette-search">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={valueCommand ? value : query}
            placeholder={valueCommand ? 'Type a tag' : 'Type a command'}
            aria-label="Command search"
            onChange={(event) => valueCommand ? setValue(event.target.value) : updateQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>

        {valueCommand ? (
          <div className="palette-value-step">
            <p>Add a tag to {targetLabel || 'the target'}.</p>
            {valueCommand.suggestions?.length > 0 && <div className="palette-suggestions">{valueCommand.suggestions.filter((tag) => !value || tag.toLowerCase().includes(value.toLowerCase())).slice(0, 8).map((tag) => <button key={tag} type="button" onClick={() => { valueCommand.runWithValue(tag); onClose() }}>{tag}</button>)}</div>}
            <button type="button" className="secondary" disabled={!value.trim()} onClick={() => { valueCommand.runWithValue(value); onClose() }}>Add tag</button>
          </div>
        ) : results.length === 0 ? (
          <p className="empty palette-empty">No matching command.</p>
        ) : (
          <ul className="palette-list">
            {results.map((command, index) => (
              <li key={command.id}>
                {(index === 0 || results[index - 1].section !== command.section) && <span className="palette-section">{command.section}</span>}
                <button
                  type="button"
                  className={`${index === activeIndex ? 'palette-item active' : 'palette-item'}${command.disabled ? ' disabled' : ''}`}
                  disabled={command.disabled}
                  title={command.disabledReason || undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(command)}
                >
                  <span>{command.label}{command.disabledReason && <small>{command.disabledReason}</small>}</span>
                  {command.hint && <span className="palette-hint">{command.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
