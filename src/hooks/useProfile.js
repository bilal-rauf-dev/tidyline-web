import { useEffect, useState } from 'react'

const STORAGE_KEY = 'tidyline:profile'
const GUEST_NAME = 'Guest'

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 48)
}

function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')

    if (!stored?.isSetUp) {
      return { isSetUp: false, name: '', isGuest: false }
    }

    return {
      isSetUp: true,
      name: normalizeName(stored.name) || GUEST_NAME,
      isGuest: Boolean(stored.isGuest),
    }
  } catch {
    return { isSetUp: false, name: '', isGuest: false }
  }
}

/**
 * Local-only profile metadata. It deliberately stays separate from task data,
 * so a future synced account can replace this record without migrating tasks.
 */
export function useProfile() {
  const [profile, setProfile] = useState(loadProfile)

  useEffect(() => {
    if (!profile.isSetUp) {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  function completeSetup(name, isGuest = false) {
    setProfile({
      isSetUp: true,
      name: isGuest ? GUEST_NAME : normalizeName(name) || GUEST_NAME,
      isGuest,
    })
  }

  function setName(name) {
    setProfile((current) => ({
      ...current,
      isSetUp: true,
      name: normalizeName(name) || GUEST_NAME,
      isGuest: normalizeName(name) === '',
    }))
  }

  return {
    ...profile,
    completeSetup,
    setName,
  }
}
