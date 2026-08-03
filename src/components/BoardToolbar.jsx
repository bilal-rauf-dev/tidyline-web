import { useState } from 'react'
import { ENERGY_FILTER_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS } from '../utils/filters'
import { SearchIcon, TagIcon } from './icons'
import { SelectMenu } from './SelectMenu'
import { Checkbox } from './Checkbox'

export function BoardToolbar({ filters, onChange, tags }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  function set(key, value) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="toolbar">
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

      <div className="toolbar-field">
        <span className="field-icon-head">
          <TagIcon />
          Tag
        </span>
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
        <SelectMenu
          value={filters.status}
          ariaLabel="Filter by status"
          options={STATUS_OPTIONS}
          onChange={(value) => set('status', value)}
        />
      </div>

      <div className="toolbar-field">
        <span className="field-icon-head">Energy</span>
        <SelectMenu
          value={filters.energyLevel}
          ariaLabel="Filter by energy level"
          options={ENERGY_FILTER_OPTIONS}
          onChange={(value) => set('energyLevel', value)}
        />
      </div>

      <div className="toolbar-field">
        <span className="field-icon-head">Sort by</span>
        <SelectMenu
          value={filters.sortBy}
          ariaLabel="Sort tasks by"
          options={SORT_OPTIONS}
          onChange={(value) => set('sortBy', value)}
        />
      </div>

      <button
        type="button"
        className="secondary"
        onClick={() => set('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}
        aria-label={`Sort ${filters.sortDir === 'asc' ? 'ascending' : 'descending'}, click to reverse`}
      >
        {filters.sortDir === 'asc' ? 'Asc' : 'Desc'}
      </button>

      <button
        type="button"
        className="secondary"
        aria-expanded={showAdvanced}
        onClick={() => setShowAdvanced((open) => !open)}
      >
        {showAdvanced ? 'Fewer filters' : 'More filters'}
      </button>

      <div
        className={showAdvanced ? 'toolbar-advanced open' : 'toolbar-advanced'}
        inert={showAdvanced ? undefined : true}
        aria-hidden={!showAdvanced}
      >
        <label className="toolbar-field">
          <span className="field-icon-head">Due from</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => set('dateFrom', event.target.value)}
          />
        </label>
        <label className="toolbar-field">
          <span className="field-icon-head">Due through</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => set('dateTo', event.target.value)}
          />
        </label>
        <label className="toolbar-field">
          <span className="field-icon-head">Minimum minutes</span>
          <input
            type="number"
            min="0"
            value={filters.durationMin}
            onChange={(event) => set('durationMin', event.target.value)}
          />
        </label>
        <label className="toolbar-field">
          <span className="field-icon-head">Maximum minutes</span>
          <input
            type="number"
            min="0"
            value={filters.durationMax}
            onChange={(event) => set('durationMax', event.target.value)}
          />
        </label>
        <label className="toolbar-pinned">
          <Checkbox
            checked={filters.pinnedOnly}
            onChange={(event) => set('pinnedOnly', event.target.checked)}
          />
          Pinned only
        </label>
      </div>
    </div>
  )
}
