/* Abre una página legal (/privacy o /terms).
   - Nativo (iOS/Android, Capacitor): abre en navegador in-app con la URL
     absoluta de Vercel — así no rompe el flujo de la app.
   - Web: abre en una pestaña nueva (no rompe el flujo de auth/onboarding en la
     pestaña actual). */

import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

const PUBLIC_BASE = 'https://ecobrenda.vercel.app'

export function openLegal(path) {
  if (!path || !path.startsWith('/')) return
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url: `${PUBLIC_BASE}${path}` }).catch(() => {})
  } else if (typeof window !== 'undefined') {
    window.open(path, '_blank', 'noopener,noreferrer')
  }
}
