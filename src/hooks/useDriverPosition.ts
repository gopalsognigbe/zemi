import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { LatLng } from '@/types';

interface UseDriverPositionResult {
  lat: number | null;
  lng: number | null;
  position: LatLng | null;
}

/**
 * Suit la position d'un zem via la table drivers (temps réel).
 */
export function useDriverPosition(
  driverId?: string,
): UseDriverPositionResult {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const driverIdRef = useRef(driverId);

  useEffect(() => {
    driverIdRef.current = driverId;

    if (!driverId) {
      setLat(null);
      setLng(null);
      return;
    }

    let cancelled = false;

    async function loadInitial() {
      const { data } = await supabase
        .from('drivers')
        .select('lat, lng')
        .eq('user_id', driverId!)
        .maybeSingle();

      if (cancelled || driverIdRef.current !== driverId) return;

      if (data?.lat != null && data?.lng != null) {
        setLat(Number(data.lat));
        setLng(Number(data.lng));
      }
    }

    void loadInitial();

    const channel = supabase
      .channel(`driver-pos-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `user_id=eq.${driverId}`,
        },
        (payload) => {
          if (driverIdRef.current !== driverId) return;
          const next = payload.new as { lat?: number; lng?: number };
          if (next.lat != null && next.lng != null) {
            setLat(Number(next.lat));
            setLng(Number(next.lng));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [driverId]);

  const position =
    lat != null && lng != null ? { lat, lng } : null;

  return { lat, lng, position };
}
