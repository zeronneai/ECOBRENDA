# Android — APK de Release firmado (Windows)

Guía para generar el **APK de release firmado** de Booty Alarm y subirlo a la
landing page para distribución directa (fuera de Google Play, por ahora).

> El APK se compila en **GitHub Actions** (la nube tiene acceso a Google; el
> contenedor de desarrollo lo tiene bloqueado). Tú solo generas el keystore
> **una vez** en tu PC con Windows y cargas 4 Secrets.

---

## 0. Resumen del flujo

1. Generas el keystore en Windows (PowerShell) — **una sola vez**.
2. Lo conviertes a base64 y cargas 4 Secrets en GitHub.
3. Disparas el workflow **"Android Release APK"** (manual).
4. Descargas el artifact `booty-alarm-release-apk` → lo subes a la landing.

⚠️ **El keystore es IRRECUPERABLE.** Si lo pierdes, NUNCA podrás actualizar la
app (ni publicar en Google Play encima de ella). **Haz backup (ver §5).**

---

## 1. Generar el keystore (PowerShell, Windows)

El comando `keytool` viene con el JDK que instaló Android Studio. Si PowerShell
no lo encuentra, suele estar en:
`C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`

### 1a. Abre PowerShell y ve a una carpeta segura

Vamos a guardar el keystore **fuera del repo** (nunca dentro de la carpeta del
proyecto). Por ejemplo, crea una carpeta dedicada:

```powershell
mkdir "$env:USERPROFILE\Documents\BootyAlarm-Keystore"
cd "$env:USERPROFILE\Documents\BootyAlarm-Keystore"
```

El archivo quedará en:
`C:\Users\<TU-USUARIO>\Documents\BootyAlarm-Keystore\bootyalarm-release.keystore`

### 1b. Genera el keystore

Si `keytool` está en el PATH:

```powershell
keytool -genkeypair -v `
  -keystore bootyalarm-release.keystore `
  -alias bootyalarm `
  -keyalg RSA -keysize 2048 `
  -validity 9125 `
  -dname "CN=Purple Roots Agency, O=Purple Roots Agency, L=El Paso, ST=TX, C=US"
```

Si PowerShell dice que no reconoce `keytool`, usa la ruta completa:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
  -keystore bootyalarm-release.keystore `
  -alias bootyalarm `
  -keyalg RSA -keysize 2048 `
  -validity 9125 `
  -dname "CN=Purple Roots Agency, O=Purple Roots Agency, L=El Paso, ST=TX, C=US"
```

Te pedirá **dos passwords**:
- **Keystore password** (almacén) → será tu `KEYSTORE_PASSWORD`
- **Key password** (de la clave `bootyalarm`) → será tu `KEY_PASSWORD`
  - Si te deja darle "Enter" para reusar la del almacén, hazlo: ambas iguales
    es más simple. Igual debes cargar las dos en Secrets.

> El backtick `` ` `` al final de cada línea es el continuador de línea de
> PowerShell. Si copias todo en una sola línea, quita los backticks.

📝 **Anota las dos passwords en tu gestor de contraseñas AHORA.** No se pueden
recuperar.

---

## 2. Verificar el keystore

```powershell
keytool -list -v -keystore bootyalarm-release.keystore
```

Debe mostrar `Alias name: bootyalarm`, `Signature algorithm: SHA256withRSA`,
`Valid from ...` con ~25 años de validez, y los datos de "Purple Roots Agency".

---

## 3. Convertir el keystore a base64 (PowerShell)

`pbcopy` es de Mac — en Windows se usa `Set-Clipboard`. Este comando lee el
keystore, lo pasa a base64 y lo copia al portapapeles:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("bootyalarm-release.keystore")) | Set-Clipboard
```

Ya tienes el base64 en el portapapeles, listo para pegar en el Secret.

> Si prefieres guardarlo a un archivo de texto para revisarlo:
> ```powershell
> [Convert]::ToBase64String([IO.File]::ReadAllBytes("bootyalarm-release.keystore")) | Out-File -Encoding ascii keystore.base64.txt
> ```
> (Borra ese .txt después; contiene tu keystore.)

---

## 4. Crear los 4 GitHub Secrets

En GitHub → repo **ECOBRENDA** → **Settings → Secrets and variables → Actions**
→ **New repository secret**. Crea estos cuatro:

| Secret              | Valor                                                        |
|---------------------|-------------------------------------------------------------|
| `KEYSTORE_BASE64`   | El base64 que copiaste al portapapeles en el §3             |
| `KEYSTORE_PASSWORD` | La password del **almacén** (keystore password)             |
| `KEY_ALIAS`         | `bootyalarm`                                                 |
| `KEY_PASSWORD`      | La password de la **clave** (key password)                  |

> Ya deberías tener también `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de
> antes. Si no, créalos igual (si faltan, el APK compila pero sin Supabase).

---

## 5. Respaldar el keystore (CRÍTICO)

El keystore es la **única** llave para actualizar la app de por vida. Guarda
**al menos 2 copias** en lugares distintos:

1. **Gestor de contraseñas** (1Password, Bitwarden): adjunta el archivo
   `bootyalarm-release.keystore` + anota las 2 passwords + el alias.
2. **Nube privada** (Google Drive / OneDrive personal, carpeta privada): sube
   el archivo `.keystore`.
3. (Opcional) **USB físico** guardado en un lugar seguro.

❌ **NO** lo subas al repo. **NO** lo mandes por chat ni email sin cifrar.
✅ El `.gitignore` ya bloquea `*.keystore`, `*.jks` y `keystore.properties`.

---

## 6. Generar el APK

1. GitHub → repo **ECOBRENDA** → pestaña **Actions**.
2. En la izquierda, elige el workflow **"Android Release APK"**.
3. Botón **"Run workflow"** → rama `claude/wizardly-thompson-c2YDO` → **Run**.
4. Espera ~5-10 min. Cuando termine (✓ verde), entra al run.
5. En **Artifacts** descarga **`booty-alarm-release-apk`** (es un .zip que
   contiene `app-release.apk`).

---

## 7. Subir a la landing page

- Descomprime el .zip → saca `app-release.apk`.
- (Recomendado) renómbralo a algo claro: `BootyAlarm-1.0.0.apk`.
- Súbelo a tu hosting / Cloudinary y enlázalo desde la landing
  **brenda-vision-ai**.
- Si el APK pesa **>100 MB**, GitHub no es buen host directo → usa Cloudinary
  u otro CDN.

> En el teléfono, el usuario deberá permitir **"Instalar apps de fuentes
> desconocidas"** para tu navegador la primera vez (es normal fuera de Play).

---

## 8. Builds locales en tu PC (opcional)

Si algún día quieres compilar el release **localmente** en Windows (no en la
nube), crea `android/keystore.properties` (ya está en `.gitignore`):

```properties
storeFile=C:/Users/<TU-USUARIO>/Documents/BootyAlarm-Keystore/bootyalarm-release.keystore
storePassword=TU_KEYSTORE_PASSWORD
keyAlias=bootyalarm
keyPassword=TU_KEY_PASSWORD
```

Luego: `cd android` → `.\gradlew assembleRelease`. El `build.gradle` lee ese
archivo automáticamente (o las variables de entorno si están definidas).

---

## Notas técnicas

- `versionCode 1`, `versionName "1.0.0"`, `applicationId com.zeronne.bootyalarm`.
- `minSdk 24` / `target 36` (defaults de Capacitor 8 — NO bajar a 23/34).
- ProGuard/R8 **apagado** en este release (minificar puede romper
  Capacitor/MediaPipe). Se puede activar después con cuidado; ya hay reglas
  `-keep` preparadas en `android/app/proguard-rules.pro`.
- Para la **próxima** versión: sube `versionCode` (2, 3, …) y `versionName`
  (1.0.1, …) en `android/app/build.gradle`, y vuelve a correr el workflow.
