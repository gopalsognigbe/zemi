import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const MIN_WRITE_MS = 10_000;

/**
 * Envoie la position du zem vers la table drivers tant que active est vrai.
 */
export function useLocationBroadcast(active: boolean): void {
  const { profile } = useAuth();
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastWriteRef = useRef(0);
  const pendingRef = useRef<{ lat: number; lng: number } | null>(null);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function pushLocation(lat: number, lng: number) {
      if (!profile?.id || cancelled) return;

      const now = Date.now();
      const elapsed = now - lastWriteRef.current;

      if (elapsed < MIN_WRITE_MS) {
        pendingRef.current = { lat, lng };
        if (!writeTimerRef.current) {
          writeTimerRef.current = setTimeout(() => {
            writeTimerRef.current = null;
            const pending = pendingRef.current;
            if (pending) {
              pendingRef.current = null;
              void pushLocation(pending.lat, pending.lng);
            }
          }, MIN_WRITE_MS - elapsed);
        }
        return;
      }

      lastWriteRef.current = now;
      pendingRef.current = null;

      await supabase
        .from('drivers')
        .update({
          lat,
          lng,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.id);
    }

    async function startWatching() {
      if (!profile?.id || !active) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) {
        return;
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10_000,
          distanceInterval: 25,
        },
        (position) => {
          void pushLocation(
            position.coords.latitude,
            position.coords.longitude,
          );
        },
      );
    }

    function stopWatching() {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (writeTimerRef.current) {
        clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
      pendingRef.current = null;
    }

    if (active && profile?.id) {
      void startWatching();
    } else {
      stopWatching();
    }

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [active, profile?.id]);
}
