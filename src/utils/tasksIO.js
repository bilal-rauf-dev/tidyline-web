export function serializeTasks(tasks) {
  return JSON.stringify(tasks, null, 2)
}

export function parseImportedTasks(json) {
  const parsed = JSON.parse(json)

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of tasks')
  }

  return parsed
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.deadline === 'string',
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      deadline: item.deadline,
      reminders: Array.isArray(item.reminders) ? item.reminders : [],
      done: Boolean(item.done),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    }))
}
