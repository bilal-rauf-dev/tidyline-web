import { useEffect, useRef, useState } from 'react'

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
 *
 * Pass `authUser` (the raw Supabase user object from useAuth().user) so this
 * hook can react to sign-in and sign-out events in a single, race-free place:
 *
 *   SIGNED IN  → if profile isn't set up or is a guest session, update the
 *                name to the Google display name.
 *   SIGNED OUT → automatically reset the profile so the WelcomeDialog shows.
 *                No external coordination in App.jsx is needed.
 */
export function useProfile(authUser = null) {
  const [profile, setProfile] = useState(loadProfile)

  // Persist to localStorage whenever the profile is active.
  useEffect(() => {
    if (!profile.isSetUp) {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  // ─── Auth ↔ profile sync ──────────────────────────────────────────────────
  // Track the previous user ref to distinguish sign-in, sign-out, and mount.
  const prevUserRef = useRef(authUser)

  useEffect(() => {
    const prevUser = prevUserRef.current
    prevUserRef.current = authUser

    if (authUser) {
      // User is signed in with Google. Sync the display name if the profile
      // isn't set up yet, or if the current session was a guest session.
      const googleName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'User'

      setProfile((current) => {
        if (!current.isSetUp || current.isGuest) {
          return {
            isSetUp: true,
            name: normalizeName(googleName) || GUEST_NAME,
            isGuest: false,
          }
        }
        // Already set up as a real (non-guest) user — don't overwrite.
        return current
      })
    } else if (prevUser) {
      // authUser just went from truthy → null: the user signed out.
      // Reset immediately so App.jsx re-renders with the WelcomeDialog.
      localStorage.removeItem(STORAGE_KEY)
      setProfile({ isSetUp: false, name: '', isGuest: false })
    }
    // On initial mount where authUser is null and prevUser is also null,
    // do nothing — we respect whatever was already in localStorage
    // (a guest session should survive a page refresh).
  }, [authUser])
  // ─────────────────────────────────────────────────────────────────────────

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

  function resetProfile() {
    localStorage.removeItem(STORAGE_KEY)
    setProfile({ isSetUp: false, name: '', isGuest: false })
  }

  return {
    ...profile,
    completeSetup,
    setName,
    resetProfile,
  }
}