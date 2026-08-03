import { useState } from 'react'

function TemplateRow({ template, onRename, onDelete }) {
  const [name, setName] = useState(template.name)

  return (
    <li className="template-settings-row">
      <div>
        <input
          type="text"
          value={name}
          aria-label={`Rename ${template.name}`}
          onChange={(event) => setName(event.target.value)}
        />
        <small>
          {template.checklist.length} checklist items · {template.tags.length} tags
        </small>
      </div>
      <button
        type="button"
        className="secondary"
        disabled={!name.trim() || name.trim() === template.name}
        onClick={() => onRename(template.id, name)}
      >
        Rename
      </button>
      <button type="button" className="secondary danger" onClick={() => onDelete(template.id)}>
        Delete
      </button>
    </li>
  )
}

export function TemplateSettings({ templates, onRename, onDelete }) {
  if (templates.length === 0) {
    return <p className="empty">No templates saved yet.</p>
  }

  return (
    <ul className="template-settings-list">
      {templates.map((template) => (
        <TemplateRow
          key={template.id}
          template={template}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
