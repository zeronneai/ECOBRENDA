# Booty Alarm — iOS setup en tu Mac (paso a paso)

Capacitor 8 usa **Swift Package Manager** (SPM), no CocoaPods. No hace falta `pod install`.

## 0. Pre-requisitos (una sola vez)
- macOS reciente con **Xcode 15+** instalado desde el App Store.
- **Node 22+** (`node -v`). Si no lo tienes: https://nodejs.org/ (la versión LTS).
- **Apple Developer Program** activo (lo tienes).
- Tu iPhone con cable USB-C/Lightning.

## 1. Clonar y construir el repo

```bash
git clone <URL-de-tu-repo>
cd ecobrenda                       # o como se llame la carpeta del repo
git checkout claude/wizardly-thompson-c2YDO
npm ci
```

Crea un archivo **`.env`** en la raíz con tus claves (las mismas que pusiste en Vercel — son las del frontend, públicas-pero-no-revelables-en-chat):

```
VITE_SUPABASE_URL=https://cmmssmcmftxlqpvrouri.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

> `.env` está en `.gitignore`, no se sube al repo.

Compila el bundle web y sincroniza iOS:

```bash
npm run build
npx cap sync ios
```

## 2. Abrir el proyecto en Xcode

```bash
npx cap open ios
```

Esto abre **Xcode** con el proyecto `ios/App/App.xcworkspace`.

## 3. Configurar firma (Signing & Capabilities)

En Xcode, panel izquierdo (Project Navigator):
1. Click en **App** (icono azul de proyecto, arriba del todo).
2. En el panel central, selecciona el target **App** (debajo de "TARGETS").
3. Pestaña **Signing & Capabilities**.
4. Verifica/configura:
   - **☑ Automatically manage signing** — déjalo activado.
   - **Team**: elige tu equipo Apple Developer en el dropdown (si está vacío, ve a Xcode → Settings → Accounts y agrega tu Apple ID con la membresía Developer).
   - **Bundle Identifier**: debe decir **`com.zeronne.bootyalarm`** (igual que Android). Si dice otra cosa, corrígelo a esto.
5. Xcode crea automáticamente el provisioning profile. Si ves errores rojos, espera unos segundos y dale a **"Try Again"**.

## 4. Empacar el sonido de la alarma (`alarm.caf`)

Usamos **`.caf`** (Core Audio Format de Apple) en lugar de `.wav`: es el formato preferido de iOS para sonidos de notificación y resuelve casos donde `.wav` no se reproducía.

Capacitor genera el proyecto pero **no agrega `alarm.caf` automáticamente** al target. Tienes que arrastrarlo una vez:

1. En el Project Navigator (izquierda), click derecho en la carpeta **App** (la que contiene `Info.plist`, `AppDelegate.swift`, etc.) → **Add Files to "App"…**
2. Navega hasta `ios/App/App/alarm.caf` (ya está ahí — yo lo dejé).
3. En el diálogo de Add Files, verifica:
   - **☑ Copy items if needed** (puede quedar OFF si el archivo ya está en su sitio; ambos funcionan).
   - **Add to targets: ☑ App** (¡importante! que esté marcado).
4. Click **Add**.

Verificación: en Project Navigator debe aparecer `alarm.caf` (icono de altavoz) bajo la carpeta App. Para confirmar que se empaqueta: selecciona el target App → **Build Phases → Copy Bundle Resources** → debe estar `alarm.caf` en la lista.

> Si vienes de la versión anterior (que usaba `alarm.wav`): puedes quitar `alarm.wav` de Copy Bundle Resources (no hace daño dejarlo, pero ya no se usa). Lo que cuenta es que **`alarm.caf` esté en la lista**.

## 5. Probar en tu iPhone (rápido, sin TestFlight)

1. Conecta tu iPhone por USB a la Mac. Desbloquea el teléfono.
2. La primera vez: en el iPhone te saldrá "Trust this computer?" → **Trust**.
3. En Xcode, arriba al lado del botón ▶, hay un selector de dispositivo. Selecciona tu iPhone (no un simulador).
4. Click el botón **▶ Run** (o `Cmd+R`).
5. Xcode compila, sube la app y la lanza en el iPhone.
6. Si te dice **"Developer Mode required"**: en el iPhone ve a Ajustes → Privacidad y seguridad → Developer Mode → ON. Reinicia el iPhone si te pide.
7. Si la app abre con un cartel de "Untrusted Developer": Ajustes → General → VPN y gestión de dispositivos → tu Team → **Confiar**.

## 6. Permisos al primer uso
La primera vez que abras la app aparecen las pantallas de priming + iOS te pedirá:
- **Notificaciones** → permite.
- **Cámara** → permite.

## 7. Probar la alarma
1. Configura una alarma para dentro de 1–2 minutos.
2. Bloquea el iPhone.
3. A la hora, suena la notificación con `alarm.wav` (~25–30 s).
4. Tócala → la app abre en AlarmRing → empieza la canción + pitido in-app y la cámara cuenta.
5. Completa las reps → todo se apaga.

> **Importante** — Apple permite máximo ~30 s de sonido en la notificación. El loop fuerte vive **dentro de la app** al tocar la notificación. Es la realidad de iOS para apps de terceros sin Critical Alerts.

## 8. TestFlight (para distribuir a beta testers)

### Una sola vez: crea la app en App Store Connect
1. https://appstoreconnect.apple.com → **My Apps → +** → **New App**.
2. Platform: **iOS**. Name: **Booty Alarm**. Bundle ID: selecciona `com.zeronne.bootyalarm`. SKU: pon cualquier string único (ej. `booty-alarm-001`). Click **Create**.

### Cada release a TestFlight
1. En Xcode, asegúrate de tener seleccionado **Any iOS Device (arm64)** arriba (no tu iPhone).
2. Menú **Product → Archive**. Xcode compila (tarda 1–3 minutos).
3. Cuando termina, abre la ventana **Organizer**. Selecciona tu archivo → **Distribute App → App Store Connect → Upload**. Sigue los defaults. Sube (tarda ~3–5 minutos).
4. En App Store Connect → tu app → **TestFlight**. El build aparece como "Processing" (~5–15 min). Cuando termine:
5. En la sección "Test Information" llena lo mínimo (email de contacto, descripción).
6. Agrega tu Apple ID en **Internal Testing → Internal Group → testers**. Recibes un email con el link.
7. En tu iPhone: instala la app **TestFlight** del App Store → abre el link del email → instalas el build.

## Pendientes (para más adelante, no urgente)

- **Stripe en iOS App Store**: hoy funciona con Stripe Checkout (web in-app browser) para TestFlight y para web/Android. Para publicar en el App Store oficial, Apple exige **In-App Purchase** para suscripciones digitales. Opciones a decidir antes de publicar en iOS:
  1. Implementar IAP en iOS (separado de Stripe).
  2. Esconder el paywall en iOS y vender solo desde web/Android ("reader app" pattern).
  3. Otra: contenido "linked out" con la nueva regla relajada de Apple (en evaluación).
- **Time Sensitive Notifications**: si tras probar quieres que la notificación bypassee DnD/silencio, se agrega el entitlement `com.apple.developer.usernotifications.time-sensitive` en Xcode → Signing & Capabilities → + Capability.
- **Critical Alerts**: requiere aprobación de Apple vía formulario (no urgente).

## Resolución de problemas comunes

- **"No accounts have been found"** al elegir Team → ve a Xcode → Settings → Accounts → +Apple ID.
- **"Code signing error"** → desmarca y vuelve a marcar "Automatically manage signing", o cierra y reabre Xcode.
- **`pod install` falló / no existe** → no lo necesitas. Capacitor 8 usa Swift Package Manager (SPM), no CocoaPods.
- **El sonido de la notificación no suena** → confirma en Xcode → target App → Build Phases → Copy Bundle Resources que `alarm.caf` está en la lista. Si no, re-arrastra (paso 4). También revisa la palanca lateral de silencio del iPhone y Ajustes → Notificaciones → Booty Alarm → Sounds = ON.
- **Premium no se activa tras pagar en TestFlight** → es lo mismo que en web/Android: al volver del navegador in-app, la app re-jala la suscripción con polling. Si no, verifica que `https://ecobrenda.vercel.app/api/stripe-webhook` esté recibiendo eventos (Stripe Dashboard → Webhooks → tu endpoint).
