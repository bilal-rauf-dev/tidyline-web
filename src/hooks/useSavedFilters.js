import { useState } from 'react'
import { DEFAULT_FILTERS } from '../utils/filters'

const STORAGE_KEY = 'tidyline:saved-filters'

function normalizeFilters(filters) {
  return { ...DEFAULT_FILTERS, ...(filters ?? {}) }
}

function loadSavedFiltersFromLocalStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.name === 'string')
      .map((entry) => ({ ...entry, filters: normalizeFilters(entry.filters) }))
  } catch {
    return []
  }
}

/**
 * useSavedFilters — manages named board filter presets.
 *
 * Accepts an optional `settingsCtx`:
 *   { settings, updateSettings, isAuthenticated }
 *
 * Authenticated users read from / write to user_settings.saved_filters.
 * Guests use localStorage exactly as before.
 */
export function useSavedFilters({
  settings = null,
  updateSettings = null,
  isAuthenticated = false,
} = {}) {
  const [localSavedFilters, setLocalSavedFilters] = useState(loadSavedFiltersFromLocalStorage)

  const savedFilters =
    isAuthenticated && settings?.savedFilters
      ? settings.savedFilters
          .filter((e) => e && typeof e.id === 'string' && typeof e.name === 'string')
          .map((e) => ({ ...e, filters: normalizeFilters(e.filters) }))
      : localSavedFilters

  function saveFilter(name, filters) {
    if (!name.trim()) return null
    const saved = {
      id:      crypto.randomUUID(),
      name:    name.trim(),
      filters: normalizeFilters(filters),
    }
    const nextFilters = [...savedFilters, saved]

    if (isAuthenticated && settings !== null) {
      updateSettings?.({ savedFilters: nextFilters })
    } else {
      setLocalSavedFilters(nextFilters)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFilters))
    }

    return saved
  }

  function deleteFilter(id) {
    const nextFilters = savedFilters.filter((entry) => entry.id !== id)

    if (isAuthenticated && settings !== null) {
      updateSettings?.({ savedFilters: nextFilters })
    } else {
      setLocalSavedFilters(nextFilters)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFilters))
    }
  }

  return { savedFilters, saveFilter, deleteFilter }
}
