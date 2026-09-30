function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    )
  }
  return value
}

function sameTask(first, second) {
  const canonical = (task) => ({
    ...task,
    createdAt: Number.isNaN(Date.parse(task.createdAt))
      ? task.createdAt
      : new Date(task.createdAt).toISOString(),
    completedAt: task.completedAt && !Number.isNaN(Date.parse(task.completedAt))
      ? new Date(task.completedAt).toISOString()
      : task.completedAt,
  })
  return JSON.stringify(stableValue(canonical(first))) === JSON.stringify(stableValue(canonical(second)))
}

async function conflictCopyId(userId, taskId) {
  const input = new TextEncoder().encode(`${userId}\0${taskId}`)
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', input)).slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x80
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Plan an additive import. Existing account tasks are never modified. */
export async function planLocalTaskMigration(userId, accountTasks, localTasks) {
  const byId = new Map(accountTasks.map((task) => [task.id, task]))
  const additions = []
  let copiedConflicts = 0

  for (const task of localTasks) {
    const existing = byId.get(task.id)
    if (existing && sameTask(existing, task)) continue

    let addition = task
    if (existing) {
      const copyId = await conflictCopyId(userId, task.id)
      addition = { ...task, id: copyId, title: `${task.title} (local copy)` }
      const savedCopy = byId.get(copyId)
      if (savedCopy) {
        if (!sameTask(savedCopy, addition)) {
          throw new Error(`An account copy of "${task.title}" has changed. Export your local tasks before resolving it.`)
        }
        continue
      }
      copiedConflicts += 1
    }

    if (!byId.has(addition.id)) {
      additions.push(addition)
      byId.set(addition.id, addition)
    }
  }

  return { additions, merged: [...additions, ...accountTasks], copiedConflicts }
}
