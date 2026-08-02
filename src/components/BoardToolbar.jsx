import { SORT_OPTIONS, STATUS_OPTIONS } from '../utils/filters'
import { SearchIcon, TagIcon } from './icons'

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

      <label className="toolbar-field">
        <span className="field-icon-head">
          <TagIcon />
          Tag
        </span>
        <select value={filters.tag} onChange={(event) => set('tag', event.target.value)}>
          <option value="all">All tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>

      <label className="toolbar-field">
        <span className="field-icon-head">Status</span>
        <select value={filters.status} onChange={(event) => set('status', event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="toolbar-field">
        <span className="field-icon-head">Sort by</span>
        <select value={filters.sortBy} onChange={(event) => set('sortBy', event.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

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
