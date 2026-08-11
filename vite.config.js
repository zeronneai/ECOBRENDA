import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        // Aísla los vendors pesados en chunks propios para mejor caché entre
        // deploys (cambiar código de la app no invalida estas librerías).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mediapipe')) return 'vendor-mediapipe'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') || id.includes('mdast') || id.includes('hast') || id.includes('unist')) return 'vendor-markdown'
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'vendor-react'
            if (id.includes('@supabase')) return 'vendor-supabase'
          }
        }
      }
    }
  }
})
