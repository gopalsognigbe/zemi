import { getCurrentPosition, type GeoPoint } from '@/lib/geo/location';
import { supabase } from '@/lib/supabase';

export interface DriverStatusResult {
  position?: GeoPoint;
  error?: string;
}

function frDbError(fallback: string, message?: string): string {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('rls')) {
    return `${fallback} (sécurité Supabase). Exécutez le SQL des policies zem dans le SQL Editor.`;
  }
  if (lower.includes('permission') || lower.includes('denied')) {
    return `${fallback} (permission refusée côté base).`;
  }
  return `${fallback} (${message})`;
}

/**
 * Crée ou met à jour la ligne drivers de l'utilisateur.
 */
async function ensureDriverOnline(
  userId: string,
  position: { lat: number; lng: number; label?: string },
): Promise<DriverStatusResult> {
  const now = new Date().toISOString();

  // 1) Tentative UPDATE (cas normal : ligne déjà créée par le trigger)
  const { data: updated, error: updateError } = await supabase
    .from('drivers')
    .update({
      is_online: true,
      lat: position.lat,
      lng: position.lng,
      updated_at: now,
    })
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();

  if (updateError) {
    return {
      error: frDbError('Impossible de passer en ligne.', updateError.message),
    };
  }

  if (updated) {
    return {
      position: {
        lat: position.lat,
        lng: position.lng,
        label: position.label ?? 'Ma position',
      },
    };
  }

  // 2) Pas de ligne → INSERT
  const { data: inserted, error: insertError } = await supabase
    .from('drivers')
    .insert({
      user_id: userId,
      is_online: true,
      lat: position.lat,
      lng: position.lng,
      updated_at: now,
    })
    .select('user_id')
    .maybeSingle();

  if (insertError || !inserted) {
    return {
      error: frDbError(
        'Impossible de passer en ligne.',
        insertError?.message ?? 'aucune ligne créée',
      ),
    };
  }

  return {
    position: {
      lat: position.lat,
      lng: position.lng,
      label: position.label ?? 'Ma position',
    },
  };
}

export async function goOnline(userId: string): Promise<DriverStatusResult> {
  try {
    const position = await getCurrentPosition();
    return ensureDriverOnline(userId, position);
  } catch {
    return {
      error:
        'GPS indisponible sur PC. Cliquez sur un lieu ci-dessous pour passer en ligne.',
    };
  }
}

export async function goOnlineAt(
  userId: string,
  position: { lat: number; lng: number; label: string },
): Promise<DriverStatusResult> {
  return ensureDriverOnline(userId, position);
}

export async function goOffline(userId: string): Promise<DriverStatusResult> {
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('drivers')
    .update({ is_online: false, updated_at: now })
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();

  if (updateError) {
    return {
      error: frDbError('Impossible de passer hors ligne.', updateError.message),
    };
  }

  if (updated) {
    return {};
  }

  // Ligne absente : en créer une déjà hors ligne
  const { error: insertError } = await supabase.from('drivers').insert({
    user_id: userId,
    is_online: false,
    updated_at: now,
  });

  if (insertError) {
    return {
      error: frDbError('Impossible de passer hors ligne.', insertError.message),
    };
  }

  return {};
}

export async function updateMyLocation(userId: string): Promise<DriverStatusResult> {
  try {
    const position = await getCurrentPosition();
    return ensureDriverOnline(userId, position);
  } catch {
    return { error: 'Impossible d’obtenir votre position. Réessayez.' };
  }
}

export async function fetchDriverRow(userId: string): Promise<{
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  error?: string;
  missing?: boolean;
}> {
  const { data, error } = await supabase
    .from('drivers')
    .select('is_online, lat, lng')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return {
      isOnline: false,
      lat: null,
      lng: null,
      error: frDbError('Impossible de charger votre statut zem.', error.message),
    };
  }

  if (!data) {
    return { isOnline: false, lat: null, lng: null, missing: true };
  }

  return {
    isOnline: Boolean(data.is_online),
    lat: data.lat != null ? Number(data.lat) : null,
    lng: data.lng != null ? Number(data.lng) : null,
  };
}
