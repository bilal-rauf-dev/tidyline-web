import { reminderKey } from './reminders'
import { normalizeDate, normalizeDuration, TASK_FIELDS } from './taskFields'

const BOOT_TIME = new Date().toISOString()

function list(value) {
  return Array.isArray(value) ? value : []
}

function normalizeReminder(entry) {
  if (typeof entry === 'string' && entry) {
    return { id: `abs:${entry}`, kind: 'absolute', at: entry }
  }
  if (!entry || typeof entry !== 'object') return null

  const kind = ['absolute', 'relative', 'recurring'].includes(entry.kind)
    ? entry.kind
    : 'absolute'
  const record = { ...entry, kind }

  if (kind === 'absolute' && typeof record.at !== 'string') return null
  if (kind === 'relative' && !(Number(record.minutesBefore) > 0)) return null
  if (kind === 'recurring' && (!record.rule || typeof record.rule !== 'object')) return null

  return { ...record, id: typeof record.id === 'string' ? record.id : reminderKey(record) }
}

function normalizeTags(value) {
  return [
    ...new Set(
      list(value)
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ]
}

function normalizeChecklist(value) {
  return list(value)
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      text: item.text.trim(),
      done: Boolean(item.done),
    }))
}

function normalizeLinks(value) {
  return list(value)
    .filter((item) => item && typeof item.url === 'string' && item.url.trim())
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      label:
        typeof item.label === 'string' && item.label.trim() ? item.label.trim() : item.url.trim(),
      url: item.url.trim(),
    }))
}

function migrateWaiting(task, tags, notes) {
  if (task.status !== 'waiting') return { tags, notes }

  const nextTags = tags.includes('waiting') ? tags : [...tags, 'waiting']
  const details = [
    typeof task.waitingFor === 'string' && task.waitingFor.trim()
      ? `Waiting for ${task.waitingFor.trim()}.`
      : 'Waiting.',
    normalizeDate(task.followUpDate) ? `Follow up ${task.followUpDate}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    tags: nextTags,
    notes: notes.includes(details) ? notes : [notes, details].filter(Boolean).join('\n\n'),
  }
}

export function normalizeTask(value) {
  const task = value && typeof value === 'object' ? value : {}
  const baseTags = normalizeTags(task.tags)
  const baseNotes = typeof task.notes === 'string' ? task.notes : ''
  const waiting = migrateWaiting(task, baseTags, baseNotes)
  const links = normalizeLinks([...list(task.links), ...list(task.attachments)])
  const normalized = {
    id: typeof task.id === 'string' && task.id ? task.id : crypto.randomUUID(),
    title: typeof task.title === 'string' && task.title.trim() ? task.title.trim() : 'Untitled task',
    deadline: normalizeDate(task.deadline),
    reminders: list(task.reminders).map(normalizeReminder).filter(Boolean),
    tags: waiting.tags,
    done: Boolean(task.done),
    completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
    pinned: Boolean(task.pinned),
    archived: Boolean(task.archived),
    recurrence: task.recurrence && typeof task.recurrence === 'object' ? task.recurrence : null,
    notes: waiting.notes,
    location: typeof task.location === 'string' ? task.location : '',
    duration: normalizeDuration(task.duration),
    checklist: normalizeChecklist(task.checklist),
    links,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : BOOT_TIME,
  }

  return Object.fromEntries(TASK_FIELDS.map((field) => [field, normalized[field]]))
}
