import { useEffect, useState } from 'react'

const THEME_KEY = 'tidyline:theme'
const ACCENT_KEY = 'tidyline:accent'
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
  { value: 'compact', label: 'Compact' },
]

function readStored(key, allowed, fallback) {
  const stored = localStorage.getItem(key)
  return allowed.includes(stored) ? stored : fallback
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY)

  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(loadTheme)
  const [accent, setAccentState] = useState(() =>
    readStored(ACCENT_KEY, ACCENT_OPTIONS.map((option) => option.value), ACCENT_OPTIONS[0].value),
  )
  const [density, setDensityState] = useState(() =>
    readStored(DENSITY_KEY, ['comfortable', 'compact'], 'comfortable'),
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    localStorage.setItem(ACCENT_KEY, accent)
  }, [accent])

  useEffect(() => {
    document.documentElement.dataset.density = density
    localStorage.setItem(DENSITY_KEY, density)
  }, [density])

  return {
    theme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    accent,
    setAccent: setAccentState,
    density,
    setDensity: setDensityState,
  }
}
