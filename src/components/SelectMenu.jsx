import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from './icons'

export function SelectMenu({ value, options, onChange, ariaLabel, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const rootRef = useRef(null)
  const closeTimerRef = useRef(null)
  const selected = options.find((option) => String(option.value) === String(value)) ?? options[0]

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => setIsMounted(false), 160)
  }, [])

  function toggleMenu() {
    if (isOpen) {
      closeMenu()
      return
    }

    window.clearTimeout(closeTimerRef.current)
    setIsMounted(true)
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        closeMenu()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMenu, isOpen])

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), [])

  return (
    <div ref={rootRef} className={['select-menu-control', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <span>{selected?.label ?? ''}</span>
        <ChevronDownIcon />
      </button>

      {isMounted && (
        <div
          className={isOpen ? 'select-menu open' : 'select-menu closing'}
          role="listbox"
          aria-label={ariaLabel}
        >
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
                  closeMenu()
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
