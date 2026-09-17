import { useEffect, useRef, useState } from 'react';

import type { LatLng } from '@/types';

export interface TrackingMapProps {
  pickup: LatLng;
  destination: LatLng;
  driverPosition?: LatLng | null;
  pickupLabel?: string;
  destinationLabel?: string;
  /** Hauteur fixe, ou 'fill' pour remplir le parent. */
  height?: number | 'fill';
  /** Marge basse du cadrage (panneau flottant). */
  bottomPadding?: number;
}

export const MAP_HEIGHT = 260;
export const FIT_PADDING = 48;
const LERP_MS = 800;

export function useSmoothedPosition(
  target: LatLng | null | undefined,
): LatLng | null {
  const [smoothed, setSmoothed] = useState<LatLng | null>(target ?? null);
  const animRef = useRef<number | null>(null);
  const fromRef = useRef<LatLng | null>(target ?? null);

  useEffect(() => {
    if (!target) {
      setSmoothed(null);
      fromRef.current = null;
      return;
    }

    if (!fromRef.current) {
      fromRef.current = target;
      setSmoothed(target);
      return;
    }

    const from = fromRef.current;
    const to = target;
    const start = Date.now();

    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
    }

    function step() {
      const t = Math.min(1, (Date.now() - start) / LERP_MS);
      const eased = t * (2 - t);
      const next = {
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
      };
      setSmoothed(next);

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        animRef.current = null;
      }
    }

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current != null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [target?.lat, target?.lng]);

  return smoothed;
}
