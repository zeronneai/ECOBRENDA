/* Foto de perfil: elige galería/cámara (@capacitor/camera), optimiza y sube a
   Supabase Storage (bucket público 'avatars', ruta <uid>/avatar.jpg). Devuelve
   la URL pública con cache-bust, o null si la usuaria cancela. */
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

// Abre el picker, optimiza (~512px, calidad 70) y sube. Devuelve la URL pública
// (con ?t= para bustear caché) o null si canceló. Lanza error si falla la subida.
export async function pickAndUploadAvatar() {
  if (!supabase) throw new Error('Falta configurar la nube.')
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess?.session?.user?.id
  if (!uid) throw new Error('Inicia sesión primero.')

  let photo
  try {
    photo = await Camera.getPhoto({
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
  } catch {
    return null // la usuaria canceló → no es error
  }
  if (!photo?.dataUrl) return null

  const blob = dataUrlToBlob(photo.dataUrl)
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
