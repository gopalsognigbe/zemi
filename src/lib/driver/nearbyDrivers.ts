import { supabase } from '@/lib/supabase';

export interface NearbyDriverPoint {
  lat: number;
  lng: number;
}

export async function fetchNearbyDrivers(
  lat: number,
  lng: number,
  radiusKm = 5,
): Promise<NearbyDriverPoint[]> {
  const { data, error } = await supabase.rpc('nearby_drivers', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
  });

  if (error) {
    throw new Error('Impossible de charger les zems à proximité.');
  }

  const rows = (data as { lat: number; lng: number }[] | null) ?? [];
  return rows.map((row) => ({
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}
