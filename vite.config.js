import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Capacitor (iOS/Android) sirve el bundle desde el esquema capacitor://localhost,
   que NO responde headers CORS. El atributo `crossorigin` que Vite pone en el
   <script type="module"> y en los <link rel="modulepreload"> hace que la WKWebView
   pida esos módulos como CORS → fallan → PANTALLA NEGRA + reintentos en bucle.
   Este plugin quita `crossorigin` del index.html final (en web/Vercel no hace
   falta porque el mismo origen resuelve sin problema). */
function stripCrossorigin() {
  return {
    name: 'strip-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(?=[\s>])/g, '')
    },
  }
}

export default defineConfig({
  plugins: [react(), stripCrossorigin()],
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
