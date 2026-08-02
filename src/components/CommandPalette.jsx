import { useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyFilter } from '../utils/fuzzy'
import { SearchIcon } from './icons'

export function CommandPalette({ commands, onClose }) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

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
    onClose()
    command?.run()
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
      run(results[activeIndex])
    }
  }

  return (
    <div className="palette-layer" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" className="palette-scrim" aria-label="Close command palette" onClick={onClose} />

      <div className="palette">
        <div className="palette-search">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Type a command"
            aria-label="Command search"
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>

        {results.length === 0 ? (
          <p className="empty palette-empty">No matching command.</p>
        ) : (
          <ul className="palette-list">
            {results.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  className={index === activeIndex ? 'palette-item active' : 'palette-item'}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(command)}
                >
                  <span>{command.label}</span>
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
