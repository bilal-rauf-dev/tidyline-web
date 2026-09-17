/**
 * useUserSettings
 *
 * Fetches and persists the single `user_settings` row for the signed-in user.
 * Guests always receive `settings = null` and the hook is a no-op for them.
 *
 * Returned `updateSettings(patch)` is optimistic: it updates React state
 * immediately and debounces the Supabase write by 300 ms so rapid UI changes
 * (e.g. accent colour clicks) don't fire excessive requests.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSettings, upsertSettings } from '../utils/supabaseStorage'

/** All localStorage keys that are migrated to user_settings. */
const LOCAL_SETTINGS_KEYS = [
  'tidyline:theme',
  'tidyline:accent',
  'tidyline:density',
  'tidyline:bucket-order',
  'tidyline:overload-hours',
  'tidyline:confirm-delete',
  'tidyline:task-templates',
  'tidyline:saved-filters',
]

/** Read whatever local settings exist. Returns null if nothing relevant found. */
function readLocalSettings() {
  const theme        = localStorage.getItem('tidyline:theme')
  const accent       = localStorage.getItem('tidyline:accent')
  const density      = localStorage.getItem('tidyline:density')
  const rawOrder     = localStorage.getItem('tidyline:bucket-order')
  const rawHours     = localStorage.getItem('tidyline:overload-hours')
  const rawConfirm   = localStorage.getItem('tidyline:confirm-delete')
  const rawTemplates = localStorage.getItem('tidyline:task-templates')
  const rawFilters   = localStorage.getItem('tidyline:saved-filters')

  const hasAny = theme || accent || density || rawOrder || rawHours || rawTemplates || rawFilters
  if (!hasAny) return null

  const result = {}
  if (theme)   result.theme   = theme
  if (accent)  result.accent  = accent
  if (density) result.density = density

  try {
    const order = JSON.parse(rawOrder)
    if (Array.isArray(order) && order.length > 0) result.bucketOrder = order
  } catch { /* ignore */ }

  const hours = Number(rawHours)
  if (Number.isFinite(hours) && hours >= 1 && hours <= 24) result.overloadHours = hours
  if (rawConfirm !== null) result.confirmDelete = rawConfirm !== 'false'

  try {
    const templates = JSON.parse(rawTemplates)
    if (Array.isArray(templates) && templates.length > 0) result.templates = templates
  } catch { /* ignore */ }

  try {
    const filters = JSON.parse(rawFilters)
    if (Array.isArray(filters) && filters.length > 0) result.savedFilters = filters
  } catch { /* ignore */ }

  return Object.keys(result).length > 0 ? result : null
}

export function useUserSettings(auth) {
  const isAuthenticated = auth?.isAuthenticated ?? false
  const user            = auth?.user ?? null
  const userId          = user?.id ?? null

  const [settings,             setSettings]             = useState(null)
  const [settingsLoading,      setSettingsLoading]      = useState(() => Boolean(isAuthenticated && userId))
  const [settingsError,        setSettingsError]        = useState(null)
  const [hasPendingMigration,  setHasPendingMigration]  = useState(false)

  // Track previous auth state to detect sign-out transitions.
  const prevAuthRef = useRef(isAuthenticated)

  // Debounce buffer: accumulate patches, flush after 300 ms of quiet
  const pendingPatch  = useRef({})
  const writeTimer    = useRef(null)

  const flushWrite = useCallback(async (uid) => {
    if (!uid || Object.keys(pendingPatch.current).length === 0) return
    const patch = pendingPatch.current
    pendingPatch.current = {}
    try {
      await upsertSettings(uid, patch)
    } catch (err) {
      console.error('[useUserSettings] write error:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        raw: err,
      })
      setSettingsError(err?.message ? `Settings sync failed: ${err.message}` : 'Failed to save settings. Check your connection.')
    }
  }, [])

  const scheduleWrite = useCallback((uid, patch) => {
    pendingPatch.current = { ...pendingPatch.current, ...patch }
    clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => flushWrite(uid), 300)
  }, [flushWrite])

  // ── Reset on sign-out (authenticated → guest) ─────────────────────────────
  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current
    prevAuthRef.current = isAuthenticated

    if (wasAuthenticated && !isAuthenticated) {
      // User just signed out — clear Supabase settings from memory.
      setSettings(null)
      setSettingsError(null)
      setHasPendingMigration(false)
      setSettingsLoading(false)
      pendingPatch.current = {}
      clearTimeout(writeTimer.current)
    }
  }, [isAuthenticated])

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return
    }

    let cancelled = false

    fetchSettings(userId)
      .then((data) => {
        if (cancelled) return
        setSettingsError(null)

        if (data === null) {
          // No settings row yet — check for local data to offer migration.
          const alreadyDismissed = sessionStorage.getItem('tidyline:settings-migration-dismissed')
          if (!alreadyDismissed) {
            const local = readLocalSettings()
            if (local) setHasPendingMigration(true)
          }
          // Seed defaults (Google display name as workspace name)
          setSettings({
            workspaceName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '',
            theme:         'dark',
            accent:        '#ff5a36',
            density:       'comfortable',
            bucketOrder:   null,
            overloadHours: 6,
            confirmDelete: true,
            templates:     [],
            savedFilters:  [],
          })
        } else {
          setSettings(data)
        }

        setSettingsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[useUserSettings] fetch error:', {
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          code: err?.code,
          raw: err,
        })
        setSettingsError(err?.message ? `Settings load failed: ${err.message}` : 'Could not load your settings. Check your connection.')
        setSettingsLoading(false)
      })

    return () => { cancelled = true }
  }, [isAuthenticated, userId, user])

  // ── updateSettings (optimistic + debounced write) ─────────────────────
  const updateSettings = useCallback((patch) => {
    if (!isAuthenticated || !userId) return
    setSettings((current) => (current ? { ...current, ...patch } : current))
    scheduleWrite(userId, patch)
  }, [isAuthenticated, userId, scheduleWrite])

  // ── migrateLocalSettings ──────────────────────────────────────────────
  const migrateLocalSettings = useCallback(async () => {
    if (!userId) return
    const local = readLocalSettings()
    if (!local) { setHasPendingMigration(false); return }

    try {
      await upsertSettings(userId, local)
      setSettings((current) => ({ ...(current ?? {}), ...local }))
      LOCAL_SETTINGS_KEYS.forEach((key) => localStorage.removeItem(key))
      setHasPendingMigration(false)
    } catch (err) {
      console.error('[useUserSettings] settings migration failed:', err)
      setSettingsError('Failed to migrate local settings. Please try again.')
    }
  }, [userId])

  const dismissSettingsMigration = useCallback(() => {
    sessionStorage.setItem('tidyline:settings-migration-dismissed', 'true')
    setHasPendingMigration(false)
  }, [])

  const clearSettingsError = useCallback(() => setSettingsError(null), [])

  return {
    settings: isAuthenticated ? settings : null,
    settingsLoading: isAuthenticated ? settingsLoading : false,
    settingsError,
    clearSettingsError,
    updateSettings,
    hasPendingSettingsMigration: hasPendingMigration,
    migrateLocalSettings,
    dismissSettingsMigration,
  }
}
