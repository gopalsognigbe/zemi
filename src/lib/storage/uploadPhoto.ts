import { supabase } from '@/lib/supabase';

/**
 * Envoie une photo de colis vers le bucket public « package-photos ».
 * Renvoie l’URL publique.
 */
export async function uploadPackagePhoto(
  localUri: string,
  userId: string,
): Promise<string> {
  try {
    const response = await fetch(localUri);
    if (!response.ok) {
      throw new Error('Échec de l’envoi de la photo.');
    }

    const blob = await response.blob();
    const contentType = blob.type || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('package-photos')
      .upload(path, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Échec de l’envoi de la photo. (${error.message})`);
    }

    const { data } = supabase.storage.from('package-photos').getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new Error('Échec de l’envoi de la photo.');
    }

    return data.publicUrl;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Échec')) {
      throw err;
    }
    throw new Error('Échec de l’envoi de la photo.');
  }
}
