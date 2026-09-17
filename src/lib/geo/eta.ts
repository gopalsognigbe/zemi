import {
  AVG_SPEED_KMH,
  DETOUR_FACTOR,
  MIN_ETA_MIN,
} from '@/constants/config';
import { haversineKm } from '@/lib/geo/distance';
import type { LatLng } from '@/types';

export { haversineKm };

/**
 * Estime le temps d'arrivée en minutes (distance routière approx. + vitesse zem).
 */
export function estimateEtaMinutes(from: LatLng, to: LatLng): number {
  const distanceKm = haversineKm(from, to) * DETOUR_FACTOR;
  const minutes = (distanceKm / AVG_SPEED_KMH) * 60;
  return Math.max(MIN_ETA_MIN, Math.ceil(minutes));
}

/** Affichage FR d'un ETA en minutes. */
export function formatEta(minutes: number): string {
  if (minutes < 1) {
    return "moins d'1 min";
  }
  return `${Math.round(minutes)} min`;
}
