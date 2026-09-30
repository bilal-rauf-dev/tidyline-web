import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { checkBackendSchema } from '../utils/supabaseHealth'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  // No Supabase client at all (unconfigured/no backend) means there's nothing to wait on.
  const [loading, setLoading] = useState(Boolean(supabase))
  const [backendStatus, setBackendStatus] = useState(supabase ? 'checking' : 'local')

  useEffect(() => {
    if (!supabase) {
      // Local-only mode: no backend configured. `loading` was already initialized to
      // `false` above for this case, so there is nothing to resolve or set here.
      return
    }

    // Check the active session and public schema independently. A valid API
    // key is not enough for cloud sync if the supplied migrations are absent.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((error) => {
      console.error('Error getting initial session:', error)
      setLoading(false)
    })
    checkBackendSchema(supabase).then(setBackendStatus).catch((error) => {
      console.error('Error checking Supabase schema:', error)
      setBackendStatus('unavailable')
    })

    // Listen for auth state transitions (sign in, sign out, OAuth redirect callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase || backendStatus !== 'ready') {
      throw new Error(
        backendStatus === 'incomplete'
          ? 'Google sign-in is unavailable until the Supabase database migrations are applied.'
          : 'Google sign-in is unavailable while cloud sync is not ready.',
      )
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      console.error('Error signing in with Google:', error.message)
      throw error
    }
    return data
  }, [backendStatus])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
      throw error
    } 
  }, [])

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User'

  const email = user?.email || user?.user_metadata?.email || ''
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  return {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
    // Whether a Supabase backend is configured at all — lets callers hide/disable
    // sign-in UI instead of offering a button that can only ever throw.
    isConfigured: Boolean(supabase),
    backendStatus,
    canSignIn: Boolean(supabase) && backendStatus === 'ready',
    displayName,
    email,
    avatarUrl,
    signInWithGoogle,
    signOut,
  }
}
