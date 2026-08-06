/* Foto de perfil. Captura (galería/cámara + optimización) sin sesión; subida a
   Supabase Storage con sesión (RLS por dueño).

   Nativo (APK/IPA): usa @capacitor/camera (selector nativo Cámara/Galería).
   Web (PC y móvil): usa un <input type=file accept="image/*"> — en móvil el
   navegador ofrece Cámara o Galería — y optimiza con canvas. Así funciona en
   todos lados sin depender de @ionic/pwa-elements. */
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { supabase } from './supabase'

export function avatarCloudReady() { return !!supabase }

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',')
  const mime = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// ── Web: reescala una imagen a ~max px y devuelve dataUrl JPEG comprimido ──────
function fileToOptimizedDataUrl(file, max = 512, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      try { resolve(canvas.toDataURL('image/jpeg', quality)) } catch (e) { reject(e) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

// ── Web: abre el selector de archivos (móvil = cámara/galería) ────────────────
function pickAvatarPhotoWeb() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    let done = false
    const finish = (v) => { if (!done) { done = true; try { input.remove() } catch { /* noop */ } resolve(v) } }
    input.onchange = async () => {
      const file = input.files && input.files[0]
      if (!file) return finish(null)
      try { finish(await fileToOptimizedDataUrl(file)) } catch { finish(null) }
    }
    // Detección de cancelación: al recuperar foco sin archivo elegido.
    const onFocus = () => {
      window.removeEventListener('focus', onFocus)
      setTimeout(() => { if (!(input.files && input.files.length)) finish(null) }, 600)
    }
    window.addEventListener('focus', onFocus)
    document.body.appendChild(input)
    input.click()
  })
}

// Devuelve un dataUrl optimizado o null si canceló. NO sube nada.
export async function pickAvatarPhoto() {
  if (!Capacitor.isNativePlatform()) return pickAvatarPhotoWeb()
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,        // iOS/Android: hoja "Cámara / Fotos"
      resultType: CameraResultType.DataUrl,
      quality: 70,
      width: 512,
      height: 512,
      correctOrientation: true,
      promptLabelHeader: 'Foto de perfil',
      promptLabelPhoto: 'Elegir de galería',
      promptLabelPicture: 'Tomar foto',
    })
    return photo?.dataUrl || null
  } catch {
    return null // canceló → no es error
  }
}

// Sube un dataUrl a Storage. Requiere sesión. Devuelve la URL pública (cache-bust).
export async function uploadAvatarDataUrl(dataUrl) {
  if (!supabase) throw new Error('Falta configurar la nube.')
  if (!dataUrl) throw new Error('Sin imagen.')
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess?.session?.user?.id
  if (!uid) throw new Error('Inicia sesión primero.')

  const blob = dataUrlToBlob(dataUrl)
  const path = `${uid}/avatar.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600',
  })
  if (error) throw new Error(error.message || 'No se pudo subir la foto.')

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${pub.publicUrl}?t=${Date.now()}`
}

// Conveniencia para Perfil (ya logueada): captura + subida en un paso.
export async function pickAndUploadAvatar() {
  const dataUrl = await pickAvatarPhoto()
  if (!dataUrl) return null
  return uploadAvatarDataUrl(dataUrl)
}
