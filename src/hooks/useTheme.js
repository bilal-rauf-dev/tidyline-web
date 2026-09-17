import { useEffect, useState } from 'react'

const THEME_KEY   = 'tidyline:theme'
const ACCENT_KEY  = 'tidyline:accent'
const DENSITY_KEY = 'tidyline:density'

/**
 * The accent is a user-selectable token: exactly one hue plays the accent
 * role at a time. Picking a different one swaps that role — it never adds a
 * second simultaneous accent. Every option is dark enough for white text.
 */
export const ACCENT_OPTIONS = [
  { value: '#ff5a36', label: 'Coral' },
  { value: '#6d5ae6', label: 'Violet' },
  { value: '#0f7d68', label: 'Teal' },
  { value: '#a85f07', label: 'Amber' },
  { value: '#37507a', label: 'Indigo' },
]

export const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact',     label: 'Compact' },
]

function readStored(key, allowed, fallback) {
  const stored = localStorage.getItem(key)
  return allowed.includes(stored) ? stored : fallback
}

/**
 * useTheme — manages theme, accent colour, and density.
 *
 * Accepts an optional `settingsCtx` object:
 *   { settings, updateSettings, isAuthenticated }
 *
 * When authenticated and settings have loaded (settings !== null):
 *   - Reads values from Supabase user_settings.
 *   - Writes changes back via updateSettings().
 *
 * Guests:
 *   - Operates against localStorage exactly as before.
 */
export function useTheme({ settings = null, updateSettings = null, isAuthenticated = false } = {}) {
  const [localTheme, setLocalTheme] = useState(() =>
    readStored(
      THEME_KEY,
      ['light', 'dark'],
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    ),
  )
  const [localAccent, setLocalAccent] = useState(() =>
    readStored(ACCENT_KEY, ACCENT_OPTIONS.map((o) => o.value), ACCENT_OPTIONS[0].value),
  )
  const [localDensity, setLocalDensity] = useState(() =>
    readStored(DENSITY_KEY, ['comfortable', 'compact'], 'comfortable'),
  )

  const theme = isAuthenticated && settings?.theme ? settings.theme : localTheme
  const accent = isAuthenticated && settings?.accent ? settings.accent : localAccent
  const density = isAuthenticated && settings?.density ? settings.density : localDensity

  // Synchronize CSS tokens and DOM attributes
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
  }, [accent])

  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    if (isAuthenticated && settings !== null) {
      updateSettings?.({ theme: next })
    } else {
      setLocalTheme(next)
      localStorage.setItem(THEME_KEY, next)
    }
  }

  function setAccent(nextAccent) {
    if (isAuthenticated && settings !== null) {
      updateSettings?.({ accent: nextAccent })
    } else {
      setLocalAccent(nextAccent)
      localStorage.setItem(ACCENT_KEY, nextAccent)
    }
  }

  function setDensity(nextDensity) {
    if (isAuthenticated && settings !== null) {
      updateSettings?.({ density: nextDensity })
    } else {
      setLocalDensity(nextDensity)
      localStorage.setItem(DENSITY_KEY, nextDensity)
    }
  }

  return {
    theme,
    toggleTheme,
    accent,
    setAccent,
    density,
    setDensity,
  }
}
