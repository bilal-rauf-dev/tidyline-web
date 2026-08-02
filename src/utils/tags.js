const TAG_TONES = ['lavender', 'accent', 'neutral']

export function parseTags(input) {
  return [
    ...new Set(
      input
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

/**
 * Deterministic tone per tag, drawn only from the existing palette.
 * Same tag always gets the same tone across the app.
 */
export function tagTone(tag) {
  let hash = 0

  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  }

  return TAG_TONES[hash % TAG_TONES.length]
}

export function collectTags(tasks) {
  const all = new Set()

  tasks.forEach((task) => {
    ;(task.tags ?? []).forEach((tag) => all.add(tag))
  })

  return [...all].sort()
}
