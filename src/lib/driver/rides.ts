import { supabase } from '@/lib/supabase';
import type { RideStatus } from '@/types';

export interface DriverRideRow {
  id: string;
  client_id: string;
  driver_id: string | null;
  pickup_lat: number;
  pickup_lng: number;
  pickup_label: string;
  destination_lat: number;
  destination_lng: number;
  destination_label: string;
  status: RideStatus;
  payment_method: 'cash' | 'wallet';
  driver_payout: number | null;
  total_price: number | null;
  created_at: string;
}

const RIDE_COLUMNS =
  'id, client_id, driver_id, pickup_lat, pickup_lng, pickup_label, destination_lat, destination_lng, destination_label, status, payment_method, driver_payout, total_price, created_at';

/** Course active du zem (assignée ou en cours). */
export async function fetchActiveRide(
  driverId: string,
): Promise<{ ride: DriverRideRow | null; error?: string }> {
  const { data, error } = await supabase
    .from('rides')
    .select(RIDE_COLUMNS)
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ride: null, error: 'Impossible de charger la course active.' };
  }

  return { ride: (data as DriverRideRow | null) ?? null };
}

/** Courses en attente d’un zem. */
export async function fetchSearchingRides(): Promise<{
  rides: DriverRideRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from('rides')
    .select(RIDE_COLUMNS)
    .eq('status', 'searching')
    .order('created_at', { ascending: true });

  if (error) {
    return { rides: [], error: 'Impossible de charger les demandes.' };
  }

  return { rides: (data as DriverRideRow[]) ?? [] };
}

/**
 * Réclamation atomique : ne réussit que si la course est encore « searching ».
 */
export async function claimRide(
  rideId: string,
  driverId: string,
): Promise<{ ride: DriverRideRow | null; alreadyTaken: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('rides')
    .update({ driver_id: driverId, status: 'assigned' })
    .eq('id', rideId)
    .eq('status', 'searching')
    .select(RIDE_COLUMNS);

  if (error) {
    return {
      ride: null,
      alreadyTaken: false,
      error: 'Impossible d’accepter la course. Réessayez.',
    };
  }

  const rows = (data as DriverRideRow[] | null) ?? [];
  if (rows.length === 0) {
    return { ride: null, alreadyTaken: true };
  }

  return { ride: rows[0], alreadyTaken: false };
}

/**
 * Démarre la course via RPC sécurisée (code passager requis).
 * Ne sélectionne jamais start_code côté zem.
 */
export async function startRideWithCode(
  rideId: string,
  code: string,
): Promise<{ error?: string; wrongCode?: boolean }> {
  const { error } = await supabase.rpc('start_ride', {
    p_ride_id: rideId,
    p_code: code,
  });

  if (!error) return {};

  const msg = (error.message || '').toUpperCase();
  console.warn('[driver] start_ride:', error.message);

  if (msg.includes('WRONG_CODE')) {
    return {
      wrongCode: true,
      error: 'Code incorrect. Vérifiez auprès du passager.',
    };
  }
  if (msg.includes('INVALID_STATUS')) {
    return { error: 'Cette course ne peut plus être démarrée.' };
  }
  if (msg.includes('NOT_YOUR_RIDE')) {
    return { error: 'Vous n’êtes pas le zem de cette course.' };
  }
  return { error: 'Impossible de démarrer la course. Réessayez.' };
}

/**
 * Termine la course via RPC (status completed + règlement portefeuille).
 * — wallet : débit client (total_price) + crédit zem (driver_payout)
 * — cash : aucun mouvement portefeuille (paiement hors app)
 *
 * Repli : si la RPC n'est pas encore déployée, on passe juste le statut
 * à « completed » (sans règlement) pour ne pas bloquer le zem.
 */
export async function completeRide(
  rideId: string,
): Promise<{ error?: string; settled?: boolean }> {
  const { error } = await supabase.rpc('complete_ride', {
    p_ride_id: rideId,
  });

  if (!error) {
    return { settled: true };
  }

  const raw = error.message || '';
  const msg = raw.toUpperCase();
  console.warn('[driver] complete_ride:', raw);

  if (msg.includes('INSUFFICIENT_BALANCE')) {
    return {
      error:
        'Solde client insuffisant pour payer en portefeuille. Demandez un paiement en espèces, puis réessayez.',
    };
  }

  if (msg.includes('STATUT INVALIDE')) {
    return {
      error:
        'Démarrez d’abord la course (bouton « Démarrer ») avant de la terminer.',
    };
  }

  if (msg.includes('NON AUTORISÉ') || msg.includes('NON AUTORISE')) {
    return { error: 'Vous n’êtes pas le zem de cette course.' };
  }

  const code = (error as { code?: string }).code;
  const rpcMissing =
    code === 'PGRST202' ||
    msg.includes('COULD NOT FIND THE FUNCTION') ||
    (msg.includes('COMPLETE_RIDE') && msg.includes('SCHEMA CACHE'));

  if (rpcMissing) {
    // Repli : terminer sans règlement portefeuille
    const { data, error: updateError } = await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', rideId)
      .in('status', ['assigned', 'in_progress'])
      .select('id')
      .maybeSingle();

    if (updateError || !data) {
      return {
        error:
          'Impossible de terminer la course. Exécutez la migration SQL 0011_complete_ride dans Supabase.',
      };
    }

    return { settled: false };
  }

  return {
    error: `Impossible de terminer la course (${raw}).`,
  };
}
