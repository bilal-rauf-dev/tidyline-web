import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from './icons'

export function SelectMenu({ value, options, onChange, ariaLabel, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.find((option) => String(option.value) === String(value)) ?? options[0]

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={rootRef} className={['select-menu-control', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{selected?.label ?? ''}</span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = String(option.value) === String(value)

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={isSelected ? 'select-option selected' : 'select-option'}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
