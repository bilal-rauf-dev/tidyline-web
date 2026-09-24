function jwtRole(key) {
  if (!key.startsWith('eyJ')) return null
  try {
    const payload = key.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized)).role ?? null
  } catch {
    return null
  }
}

export function isUnsafeSupabaseBrowserKey(key) {
  const value = typeof key === 'string' ? key.trim() : ''
  return value.startsWith('sb_secret_') || jwtRole(value) === 'service_role'
}

export function assertSafeSupabaseBrowserKey(key) {
  if (isUnsafeSupabaseBrowserKey(key)) {
    throw new Error(
      'A Supabase server key was assigned to a VITE_ variable. Use the project publishable key or legacy anon key in browser code.',
    )
  }
}
