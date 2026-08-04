import { useEffect, useState } from 'react'

const STORAGE_KEY = 'tidyline:task-templates'

function list(value) {
  return Array.isArray(value) ? value : []
}

function normalizeTemplate(template) {
  return {
    id: typeof template.id === 'string' ? template.id : crypto.randomUUID(),
    name: typeof template.name === 'string' && template.name.trim() ? template.name.trim() : 'Untitled template',
    notes: typeof template.notes === 'string' ? template.notes : '',
    tags: list(template.tags).filter((tag) => typeof tag === 'string'),
    checklist: list(template.checklist)
      .filter((item) => item && typeof item.text === 'string')
      .map((item) => ({ text: item.text })),
    duration: template.duration ?? null,
    reminders: list(template.reminders),
    recurrence: template.recurrence ?? null,
  }
}

function loadTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.map(normalizeTemplate) : []
  } catch {
    return []
  }
}

export function taskToTemplate(task, name) {
  return normalizeTemplate({
    id: crypto.randomUUID(),
    name,
    notes: task.notes,
    tags: task.tags,
    checklist: task.checklist,
    duration: task.duration,
    reminders: task.reminders,
    recurrence: task.recurrence,
  })
}

export function useTemplates() {
  const [templates, setTemplates] = useState(loadTemplates)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  function saveTaskTemplate(task, name) {
    if (!name.trim()) return null
    const template = taskToTemplate(task, name)
    setTemplates((current) => [...current, template])
    return template
  }

  function renameTemplate(id, name) {
    if (!name.trim()) return
    setTemplates((current) =>
      current.map((template) =>
        template.id === id ? { ...template, name: name.trim() } : template,
      ),
    )
  }

  function deleteTemplate(id) {
    setTemplates((current) => current.filter((template) => template.id !== id))
  }

  return { templates, saveTaskTemplate, renameTemplate, deleteTemplate }
}
