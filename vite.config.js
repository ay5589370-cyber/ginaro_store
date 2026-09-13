import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('react-router-dom')) return 'react-vendor'
          if (id.includes('firebase')) return 'firebase-vendor'
          if (id.includes('@supabase')) return 'supabase-vendor'

          return 'vendor'
        },
      },
    },
  },
})
