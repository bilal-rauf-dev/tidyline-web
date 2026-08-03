import { useEffect, useState } from 'react'
import { DEFAULT_FILTERS } from '../utils/filters'

const STORAGE_KEY = 'tidyline:saved-filters'

function normalizeFilters(filters) {
  return { ...DEFAULT_FILTERS, ...(filters ?? {}) }
}

function loadSavedFilters() {
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

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState(loadSavedFilters)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters))
  }, [savedFilters])

  function saveFilter(name, filters) {
    if (!name.trim()) return null
    const saved = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters: normalizeFilters(filters),
    }
    setSavedFilters((current) => [...current, saved])
    return saved
  }

  function deleteFilter(id) {
    setSavedFilters((current) => current.filter((entry) => entry.id !== id))
  }

  return { savedFilters, saveFilter, deleteFilter }
}
