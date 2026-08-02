import { SORT_OPTIONS, STATUS_OPTIONS } from '../utils/filters'
import { SearchIcon, TagIcon } from './icons'
import { SelectMenu } from './SelectMenu'

export function BoardToolbar({ filters, onChange, tags }) {
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
    </div>
  )
}
