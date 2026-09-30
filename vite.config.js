import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { assertSafeSupabaseBrowserKey } from './src/utils/supabaseKey.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  assertSafeSupabaseBrowserKey(env.VITE_SUPABASE_PUBLISHABLE_KEY)
  assertSafeSupabaseBrowserKey(env.VITE_SUPABASE_ANON_KEY)
  const exposedPushPrivateKey = Object.entries(env).find(([name, value]) =>
    name.startsWith('VITE_') && value &&
    ((name.includes('WEB_PUSH') && name.includes('PRIVATE')) ||
      (name.includes('VAPID') && name.includes('PRIVATE'))),
  )
  if (exposedPushPrivateKey) {
    throw new Error('A Web Push private key was assigned to a VITE_ variable. Keep it in server-only secrets.')
  }

  return {
    plugins: [react()],
    server: {
      // Honour an externally assigned port (tooling sets PORT) instead of
      // silently auto-incrementing off 5173 when that port is taken.
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
    },
  }
})
