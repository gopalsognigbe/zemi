import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getMessages,
  markThreadRead,
  sendMessage,
  type ChatMessage,
  type ChatThreadType,
} from '@/lib/chat/chatApi';
import { supabase } from '@/lib/supabase';

interface UseChatResult {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  send: (body: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  retryPayload: string | null;
}

/**
 * Charge un fil de discussion et s'abonne aux nouveaux messages en temps réel.
 */
export function useChat(
  threadType: ChatThreadType | undefined,
  threadId: string | undefined,
  receiverId: string | undefined,
  myUserId?: string,
): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(threadType && threadId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const markRead = useCallback(async () => {
    if (!threadType || !threadId) return;
    await markThreadRead(threadType, threadId);
  }, [threadType, threadId]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryPayload(null);
  }, []);

  const load = useCallback(async () => {
    if (!threadType || !threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const list = await getMessages(threadType, threadId);
      if (requestId !== requestIdRef.current) return;
      setMessages(list);
      await markRead();
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les messages.',
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [threadType, threadId, markRead]);

  useEffect(() => {
    if (!threadType || !threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    void load();

    const channel = supabase
      .channel(`chat-${threadType}-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            thread_type: ChatThreadType;
            thread_id: string;
            sender_id: string;
            receiver_id: string;
            body: string;
            read_at: string | null;
            created_at: string;
          };

          if (row.thread_type !== threadType) return;

          const next: ChatMessage = {
            id: row.id,
            threadType: row.thread_type,
            threadId: row.thread_id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            body: row.body,
            readAt: row.read_at,
            createdAt: row.created_at,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev;
            // Remplace un message optimiste identique
            const withoutOptimistic = prev.filter(
              (m) =>
                !(
                  m.id.startsWith('temp-') &&
                  m.body === next.body &&
                  m.senderId === next.senderId
                ),
            );
            return [...withoutOptimistic, next];
          });

          void markRead();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            thread_type: ChatThreadType;
            read_at: string | null;
            body?: string;
          };
          if (row.thread_type !== threadType) return;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id ? { ...m, readAt: row.read_at } : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadType, threadId, load, markRead]);

  const send = useCallback(
    async (body: string) => {
      if (!threadType || !threadId || !receiverId) {
        setError('Conversation indisponible.');
        return;
      }

      const trimmed = body.trim();
      if (!trimmed) return;

      const tempId = `temp-${Date.now()}`;
      if (myUserId) {
        const optimistic: ChatMessage = {
          id: tempId,
          threadType,
          threadId,
          senderId: myUserId,
          receiverId,
          body: trimmed,
          readAt: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
      }

      setSending(true);
      setError(null);
      setRetryPayload(null);

      try {
        const message = await sendMessage({
          threadType,
          threadId,
          receiverId,
          body: trimmed,
        });
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp;
          return [...withoutTemp, message];
        });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setRetryPayload(trimmed);
        setError(
          err instanceof Error
            ? err.message
            : "Impossible d'envoyer le message.",
        );
      } finally {
        setSending(false);
      }
    },
    [threadType, threadId, receiverId, myUserId],
  );

  return {
    messages,
    loading,
    sending,
    send,
    error,
    clearError,
    retryPayload,
  };
}
