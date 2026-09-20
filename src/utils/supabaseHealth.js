const MISSING_SCHEMA_CODES = new Set(['42P01', 'PGRST202', 'PGRST204', 'PGRST205'])

export function classifyBackendErrors(errors) {
  const failures = errors.filter(Boolean)
  if (failures.length === 0) return 'ready'
  return failures.some((error) => MISSING_SCHEMA_CODES.has(error.code))
    ? 'incomplete'
    : 'unavailable'
}

export async function checkBackendSchema(client) {
  if (!client) return 'local'
  const [tasks, settings] = await Promise.all([
    client.from('tasks').select('id,deadline_time').limit(1),
    client.from('user_settings').select('user_id').limit(1),
  ])
  return classifyBackendErrors([tasks.error, settings.error])
}
