import { supabase } from '@/lib/supabase';
import type { PricingProfile } from '@/lib/pricing/types';

export interface FareApiPoint {
  lat: number;
  lng: number;
}

export interface FareApiResult {
  driverPayout: number;
  zemiCommission: number;
  totalPrice: number;
  distanceKm: number;
  durationMin?: number;
  profile: PricingProfile;
}

interface RequestFareParams {
  profile: PricingProfile;
  pickup: FareApiPoint;
  destination: FareApiPoint;
}

/**
 * Appelle l’Edge Function compute-fare (source unique de vérité côté serveur).
 */
export async function requestFare({
  profile,
  pickup,
  destination,
}: RequestFareParams): Promise<FareApiResult> {
  const { data, error } = await supabase.functions.invoke('compute-fare', {
    body: { profile, pickup, destination },
  });

  if (error) {
    throw new Error('Impossible de calculer le prix.');
  }

  if (!data || typeof data !== 'object' || 'error' in data) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : 'Impossible de calculer le prix.';
    throw new Error(message || 'Impossible de calculer le prix.');
  }

  const result = data as FareApiResult;
  if (
    typeof result.totalPrice !== 'number' ||
    typeof result.driverPayout !== 'number' ||
    typeof result.zemiCommission !== 'number'
  ) {
    throw new Error('Impossible de calculer le prix.');
  }

  return result;
}
