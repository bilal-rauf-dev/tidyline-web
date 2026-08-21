import { useEffect, useRef, useState } from 'react'
import { PRIORITY_FILTER_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS } from '../utils/filters'
import { ChevronDownIcon, SearchIcon, TagIcon } from './icons'
import { SelectMenu } from './SelectMenu'
import { Checkbox } from './Checkbox'

export function BoardToolbar({ filters, onChange, tags }) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)

  function set(key, value) {
    onChange({ ...filters, [key]: value })
  }

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

  return (
    <div className="toolbar" ref={popoverRef}>
      <div className="toolbar-search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search tasks and tags"
          aria-label="Search tasks"
          value={filters.query}
          onChange={(event) => set('query', event.target.value)}
        />
      </div>

      <button
        type="button"
        className={isOpen ? 'toolbar-disclosure open' : 'toolbar-disclosure'}
        aria-label="Show task filters"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        title="Filters"
      >
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="toolbar-filter-popover" aria-label="Task filters">
          <div className="toolbar-field">
            <span className="field-icon-head"><TagIcon />Tag</span>
            <SelectMenu
              value={filters.tag}
              ariaLabel="Filter by tag"
              options={[
                { value: 'all', label: 'All tags' },
                ...tags.map((tag) => ({ value: tag, label: tag })),
              ]}
              onChange={(value) => set('tag', value)}
            />
          </div>

          <div className="toolbar-field">
            <span className="field-icon-head">Status</span>
            <SelectMenu value={filters.status} ariaLabel="Filter by status" options={STATUS_OPTIONS} onChange={(value) => set('status', value)} />
          </div>

          <div className="toolbar-field">
            <span className="field-icon-head">Priority</span>
            <SelectMenu value={filters.priority} ariaLabel="Filter by priority" options={PRIORITY_FILTER_OPTIONS} onChange={(value) => set('priority', value)} />
          </div>

          <div className="toolbar-field">
            <span className="field-icon-head">Sort by</span>
            <SelectMenu value={filters.sortBy} ariaLabel="Sort tasks by" options={SORT_OPTIONS} onChange={(value) => set('sortBy', value)} />
          </div>

          <button type="button" className="secondary toolbar-sort-direction" onClick={() => set('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}>
            {filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
          </button>

          <label className="toolbar-field">
            <span className="field-icon-head">Due from</span>
            <input type="date" value={filters.dateFrom} onChange={(event) => set('dateFrom', event.target.value)} />
          </label>
          <label className="toolbar-field">
            <span className="field-icon-head">Due through</span>
            <input type="date" value={filters.dateTo} onChange={(event) => set('dateTo', event.target.value)} />
          </label>
          <label className="toolbar-field">
            <span className="field-icon-head">Minimum minutes</span>
            <input type="number" min="0" value={filters.durationMin} onChange={(event) => set('durationMin', event.target.value)} />
          </label>
          <label className="toolbar-field">
            <span className="field-icon-head">Maximum minutes</span>
            <input type="number" min="0" value={filters.durationMax} onChange={(event) => set('durationMax', event.target.value)} />
          </label>
          <label className="toolbar-pinned">
            <Checkbox checked={filters.pinnedOnly} onChange={(event) => set('pinnedOnly', event.target.checked)} />
            Pinned only
          </label>
        </div>
      )}
    </div>
  )
}
