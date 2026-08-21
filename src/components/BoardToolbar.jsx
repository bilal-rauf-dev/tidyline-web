import { SearchIcon } from './icons'

export function BoardToolbar({ query, onChange }) {
  return (
    <div className="toolbar">
      <div className="toolbar-search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search tasks and tags"
          aria-label="Search tasks"
          value={query}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}
