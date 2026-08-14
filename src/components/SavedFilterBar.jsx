import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from './icons'
import { SelectMenu } from './SelectMenu'

export function SavedFilterBar({ savedFilters, onApply, onSave, onDelete }) {
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)
  const selected = savedFilters.find((entry) => entry.id === selectedId)

  useEffect(() => {
    function closeOnOutsidePress(event) {
      if (!popoverRef.current?.contains(event.target)) setIsOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function save() {
    const saved = onSave(name)
    if (!saved) return
    setSelectedId(saved.id)
    setName('')
  }

  return (
    <div className="saved-filter-bar" ref={popoverRef}>
      <button
        type="button"
        className={isOpen ? 'saved-filter-trigger open' : 'saved-filter-trigger'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>Views</span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="saved-filter-popover" aria-label="Saved views">
          <div className="saved-filter-picker">
            <span className="field-icon-head">Saved views</span>
            <SelectMenu
              value={selectedId}
              ariaLabel="Choose a saved filter view"
              options={[
                { value: '', label: 'Choose a view' },
                ...savedFilters.map((entry) => ({ value: entry.id, label: entry.name })),
              ]}
              onChange={(id) => {
                setSelectedId(id)
                const entry = savedFilters.find((item) => item.id === id)
                if (entry) onApply(entry.filters)
              }}
            />
          </div>
          <label className="saved-filter-name">
            <span className="field-icon-head">Save current filters</span>
            <input type="text" value={name} placeholder="Name this view" onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="saved-filter-actions">
            <button type="button" className="secondary" disabled={!name.trim()} onClick={save}>Save view</button>
            <button type="button" className="secondary danger" disabled={!selected} onClick={() => {
              if (!selected) return
              onDelete(selected.id)
              setSelectedId('')
            }}>Delete view</button>
          </div>
        </div>
      )}
    </div>
  )
}
