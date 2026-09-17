import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

interface UseRealtimeRowResult<T> {
  row: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Charge une ligne puis s'abonne aux mises à jour Postgres en temps réel.
 */
export function useRealtimeRow<T extends { id: string }>(
  table: string,
  id: string | undefined,
): UseRealtimeRowResult<T> {
  const [row, setRow] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!id) {
      setRow(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (requestId !== requestIdRef.current) return;

    if (fetchError) {
      setError('Mise à jour impossible pour le moment.');
      setLoading(false);
      return;
    }

    if (!data) {
      setError('Élément introuvable ou accès refusé.');
      setRow(null);
    } else {
      setRow(data as T);
      setError(null);
    }

    setLoading(false);
  }, [id, table]);

  useEffect(() => {
    if (!id) {
      setRow(null);
      setLoading(false);
      return;
    }

    void refresh();

    const channel = supabase
      .channel(`row-${table}-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) {
            setRow(payload.new as T);
            setError(null);
            setLoading(false);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, table, refresh]);

  return { row, loading, error, refresh };
}
