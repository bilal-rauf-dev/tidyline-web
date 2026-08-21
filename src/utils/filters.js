export const DEFAULT_FILTERS = { query: '' }

export function filterTasks(tasks, filters = DEFAULT_FILTERS) {
  const query = String(filters.query ?? '').trim().toLowerCase()
  if (!query) return tasks

  return tasks.filter((task) =>
    [task.title, task.notes, task.location, ...(task.tags ?? [])]
      .join(' ')
      .toLowerCase()
      .includes(query),
  )
}
