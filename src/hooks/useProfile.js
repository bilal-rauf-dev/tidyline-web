import { useEffect, useState } from 'react'

const STORAGE_KEY = 'tidyline:profile'
const GUEST_NAME  = 'Guest'

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 48)
}

/**
 * Load the saved workspace name from localStorage (so it can pre-fill the
 * WelcomeDialog for returning guests), but do NOT restore isSetUp — guests
 * must explicitly choose "Start as guest" every session.
 */
function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return {
      isSetUp:  false,                                       // always start fresh
      name:     normalizeName(stored?.name) || '',           // recall previous name
      isGuest:  false,
    }
  } catch {
    return { isSetUp: false, name: '', isGuest: false }
  }
}

function googleNameFrom(authUser) {
  return (
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name      ||
    authUser?.email?.split('@')[0]     ||
    'User'
  )
}

/**
 * Local-only profile metadata. Stays separate from task data.
 *
 * Pass `authUser`  (raw Supabase user from useAuth().user) so the hook can
 * react to sign-in / sign-out events.
 *
 * Pass `settingsCtx` ({ settings, updateSettings }) when the user is
 * authenticated so that the workspace name is read from / written to
 * user_settings rather than localStorage.
 *
 * SIGNED IN  → profile is derived from auth + settings; localStorage is not
 *              written (profile.isSetUp is always true, isGuest always false).
 * SIGNED OUT → profile resets so WelcomeDialog re-appears.
 * GUEST      → unchanged localStorage behaviour.
 */
export function useProfile(authUser = null, settingsCtx = null) {
  const isAuthenticated = Boolean(authUser)
  const { settings = null, updateSettings = null } = settingsCtx ?? {}

  const [localProfile, setLocalProfile] = useState(loadProfile)

  const activeProfile = authUser
    ? {
        isSetUp: true,
        name:
          normalizeName(settings?.workspaceName || googleNameFrom(authUser)) ||
          GUEST_NAME,
        isGuest: false,
      }
    : localProfile

  // ── Guest localStorage persistence (authenticated users skip this) ────────
  useEffect(() => {
    if (isAuthenticated || !localProfile.isSetUp) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localProfile))
  }, [localProfile, isAuthenticated])

  function completeSetup(name, isGuest = false) {
    setLocalProfile({
      isSetUp: true,
      name:    isGuest ? GUEST_NAME : normalizeName(name) || GUEST_NAME,
      isGuest,
    })
  }

  function setName(name) {
    const normalized = normalizeName(name) || GUEST_NAME

    if (isAuthenticated) {
      // For authenticated users, persist to Supabase via settingsCtx.
      updateSettings?.({ workspaceName: normalized })
    } else {
      // For guests, update local state (localStorage effect handles persistence).
      setLocalProfile((current) => ({
        ...current,
        isSetUp: true,
        name:    normalized,
        isGuest: normalizeName(name) === '',
      }))
    }
  }

  function resetProfile() {
    localStorage.removeItem(STORAGE_KEY)
    setLocalProfile({ isSetUp: false, name: '', isGuest: false })
  }

  return {
    ...activeProfile,
    completeSetup,
    setName,
    resetProfile,
  }
}