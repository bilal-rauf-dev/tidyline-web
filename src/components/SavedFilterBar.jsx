import { useState } from 'react'
import { SelectMenu } from './SelectMenu'

export function SavedFilterBar({ savedFilters, onApply, onSave, onDelete }) {
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const selected = savedFilters.find((entry) => entry.id === selectedId)

  function save() {
    const saved = onSave(name)
    if (!saved) return
    setSelectedId(saved.id)
    setName('')
  }

  return (
    <div className="saved-filter-bar">
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
        <input
          type="text"
          value={name}
          placeholder="University tasks due this week"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button type="button" className="secondary" disabled={!name.trim()} onClick={save}>
        Save view
      </button>
      <button
        type="button"
        className="secondary danger"
        disabled={!selected}
        onClick={() => {
          if (!selected) return
          onDelete(selected.id)
          setSelectedId('')
        }}
      >
        Delete view
      </button>
    </div>
  )
}
