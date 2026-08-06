/* Foto de perfil. La CAPTURA (galería/cámara + optimización) no requiere sesión;
   la SUBIDA a Supabase Storage sí (RLS por dueño). En el onboarding se captura y
   se guarda el dataUrl localmente; se sube tras crear la cuenta. En Perfil (ya
   logueada) se hace captura+subida de una vez. Bucket público 'avatars', ruta
   <uid>/avatar.jpg; URL pública con cache-bust. */
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

// Abre el picker (galería/cámara) y devuelve un dataUrl optimizado (~512px, q70)
// o null si canceló. NO sube nada.
export async function pickAvatarPhoto() {
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,        // iOS: hoja "Cámara / Fotos"
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
    return null // la usuaria canceló → no es error
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
