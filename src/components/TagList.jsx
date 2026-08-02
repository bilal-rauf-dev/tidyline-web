import { tagTone } from '../utils/tags'

/**
 * Flat left-bordered tag marks. Never pill-shaped — see design.md.
 */
export function TagList({ tags, onRemove }) {
  if (!tags || tags.length === 0) {
    return null
  }

  return (
    <ul className="tag-list">
      {tags.map((tag) => (
        <li key={tag} className={`tag tag-${tagTone(tag)}`}>
          <span>{tag}</span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove tag ${tag}`}>
              &times;
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
