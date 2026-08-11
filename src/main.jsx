import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import './styles/tokens.css'
import './styles/app.css'
import './lib/alarmKitTest' // TEMP Fase 2: expone window.AlarmKitTest para probar en device (quitar antes de prod)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
        <Analytics />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)
