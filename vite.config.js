import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honour an externally assigned port (tooling sets PORT) instead of
    // silently auto-incrementing off 5173 when that port is taken.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
