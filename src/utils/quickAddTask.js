import { toDateStr } from './calendar'

export const PARSER_FIELD_MAP = {
  title: 'title', deadline: 'deadline', startDate: 'startDate', reminderMinutes: 'reminders',
  durationMinutes: 'duration', recurrence: 'recurrence', priority: 'priority', tags: 'tags',
  planForToday: 'plannedDate',
}
export const PARSER_ONLY_KEYS = ['matchedTokens']

export function toLocalYMD(date) {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildQuickAddTask(parsed, referenceDate = new Date()) {
  const todayStr = toDateStr(referenceDate)
  return {
    title: parsed.title,
    deadline: parsed.deadline ? toLocalYMD(parsed.deadline) : null,
    tags: parsed.tags,
    reminders: parsed.reminderMinutes === null ? [] : [{ id: `rel:${parsed.reminderMinutes}`, kind: 'relative', minutesBefore: parsed.reminderMinutes }],
    recurrence: parsed.recurrence,
    priority: parsed.priority ?? null,
    notes: '', checklist: [], links: [], attachments: [], location: '',
    duration: parsed.durationMinutes === null ? null : { value: parsed.durationMinutes, unit: 'min' },
    startDate: parsed.startDate ? toLocalYMD(parsed.startDate) : null,
    status: 'active', waitingFor: '', followUpDate: null,
    plannedDate: parsed.planForToday ? todayStr : null,
  }
}
