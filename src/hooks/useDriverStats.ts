import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

interface UseDriverStatsResult {
  earningsToday: number;
  jobsToday: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Stats du jour pour le zem connecté (RPC driver_today_stats).
 */
export function useDriverStats(): UseDriverStatsResult {
  const [earningsToday, setEarningsToday] = useState(0);
  const [jobsToday, setJobsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('driver_today_stats');

      if (error) {
        console.warn('[driver] driver_today_stats:', error.message);
        setEarningsToday(0);
        setJobsToday(0);
        return;
      }

      const row = (data ?? {}) as Record<string, unknown>;
      const earnings =
        row.earnings_today ?? row.earningsToday ?? row.earnings ?? 0;
      const jobs = row.jobs_today ?? row.jobsToday ?? row.jobs ?? 0;

      setEarningsToday(Number(earnings) || 0);
      setJobsToday(Number(jobs) || 0);
    } catch (err) {
      console.warn('[driver] useDriverStats:', err);
      setEarningsToday(0);
      setJobsToday(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { earningsToday, jobsToday, loading, refresh };
}
