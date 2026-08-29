import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[TidyLine] Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are ' +
      'missing). Running in local-only mode: tasks stay in this browser and Google sign-in is ' +
      'unavailable until these are set. See .env.example.',
  )
}

// `createClient` throws synchronously when the URL/key are missing, which — left unguarded —
// crashes the whole module graph before React ever mounts (App.jsx and main.jsx both import
// this at the top). TidyLine is local-first by design (see design.md), so a missing/unreachable
// backend must never block the app from loading: fall back to a null client and let callers
// (see useAuth.js) treat that as "no auth available" rather than an error.
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
