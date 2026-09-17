import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

interface UseUnreadCountResult {
  count: number;
}

/**
 * Compte les messages reçus non lus, mis à jour en temps réel (pastille).
 */
export function useUnreadCount(): UseUnreadCountResult {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async (userId: string) => {
    const { count: unread, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) {
      console.warn('[chat] useUnreadCount:', error.message);
      return;
    }

    setCount(unread ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) {
        setCount(0);
        return;
      }

      await refresh(user.id);

      channel = supabase
        .channel(`unread-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            void refresh(user.id);
          },
        )
        .subscribe();
    }

    void setup();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refresh]);

  return { count };
}
