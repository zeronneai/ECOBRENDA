import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AppProvider } from './context/AppContext.jsx'
import './styles/tokens.css'
import './styles/app.css'

// Vercel Analytics es SOLO para la web (Vercel). En la app nativa (iOS/Android)
// intenta cargar /_vercel/insights/script.js desde capacitor://localhost → 404 y
// ruido de errores. Se monta únicamente cuando NO corremos en Capacitor.
const isNative = Capacitor.isNativePlatform()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <App />
          {!isNative && <Analytics />}
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
