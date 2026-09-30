import { useState } from 'react'
import { normalizeRecurrence } from '../utils/recurrence'

const STORAGE_KEY = 'tidyline:task-templates'

function list(value) {
  return Array.isArray(value) ? value : []
}

function normalizeTemplateRecurrence(value) {
  const recurrence = normalizeRecurrence(value)
  if (!recurrence) return null

  // Calendar anchors belong to a task's due date, not to a reusable template.
  return recurrence.freq === 'monthly' || recurrence.freq === 'yearly'
    ? { freq: recurrence.freq }
    : recurrence
}

function normalizeTemplate(template) {
  return {
    id: typeof template.id === 'string' ? template.id : crypto.randomUUID(),
    name:
      typeof template.name === 'string' && template.name.trim()
        ? template.name.trim()
        : 'Untitled template',
    notes:     typeof template.notes === 'string' ? template.notes : '',
    tags:      list(template.tags).filter((tag) => typeof tag === 'string'),
    checklist: list(template.checklist)
      .filter((item) => item && typeof item.text === 'string')
      .map((item) => ({ text: item.text })),
    duration:   template.duration ?? null,
    priority:   ['high', 'medium', 'low'].includes(template.priority) ? template.priority : null,
    reminders:  list(template.reminders),
    recurrence: normalizeTemplateRecurrence(template.recurrence),
  }
}

function loadTemplatesFromLocalStorage() {
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
    notes:      task.notes,
    tags:       task.tags,
    checklist:  task.checklist,
    duration:   task.duration,
    priority:   task.priority,
    reminders:  task.reminders,
    recurrence: task.recurrence,
  })
}

/**
 * useTemplates — manages reusable task templates.
 *
 * Accepts an optional `settingsCtx`:
 *   { settings, updateSettings, isAuthenticated }
 *
 * Authenticated users read from / write to user_settings.templates.
 * Guests use localStorage exactly as before.
 */
export function useTemplates({
  settings = null,
  updateSettings = null,
  isAuthenticated = false,
} = {}) {
  const [localTemplates, setLocalTemplates] = useState(loadTemplatesFromLocalStorage)

  const templates =
    isAuthenticated && settings?.templates
      ? settings.templates.map(normalizeTemplate)
      : localTemplates

  function saveTaskTemplate(task, name) {
    if (!name.trim()) return null
    const template = taskToTemplate(task, name)
    const nextTemplates = [...templates, template]

    if (isAuthenticated && settings !== null) {
      updateSettings?.({ templates: nextTemplates })
    } else {
      setLocalTemplates(nextTemplates)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTemplates))
    }

    return template
  }

  function renameTemplate(id, name) {
    if (!name.trim()) return
    const nextTemplates = templates.map((t) =>
      t.id === id ? { ...t, name: name.trim() } : t,
    )

    if (isAuthenticated && settings !== null) {
      updateSettings?.({ templates: nextTemplates })
    } else {
      setLocalTemplates(nextTemplates)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTemplates))
    }
  }

  function deleteTemplate(id) {
    const nextTemplates = templates.filter((t) => t.id !== id)

    if (isAuthenticated && settings !== null) {
      updateSettings?.({ templates: nextTemplates })
    } else {
      setLocalTemplates(nextTemplates)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTemplates))
    }
  }

  return { templates, saveTaskTemplate, renameTemplate, deleteTemplate }
}
