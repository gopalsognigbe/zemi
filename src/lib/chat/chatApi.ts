import { supabase } from '@/lib/supabase';

export type ChatThreadType = 'ride' | 'delivery';

export interface ChatMessage {
  id: string;
  threadType: ChatThreadType;
  threadId: string;
  senderId: string;
  receiverId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface MessageRow {
  id: string;
  thread_type: ChatThreadType;
  thread_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    threadType: row.thread_type,
    threadId: row.thread_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Vous devez être connecté pour utiliser la messagerie.');
  }

  return user.id;
}

/**
 * Envoie un message dans un fil (course ou livraison).
 */
export async function sendMessage(params: {
  threadType: ChatThreadType;
  threadId: string;
  receiverId: string;
  body: string;
}): Promise<ChatMessage> {
  const trimmed = params.body.trim();
  if (!trimmed) {
    throw new Error('Le message ne peut pas être vide.');
  }

  const senderId = await requireUserId();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_type: params.threadType,
      thread_id: params.threadId,
      sender_id: senderId,
      receiver_id: params.receiverId,
      body: trimmed,
    })
    .select(
      'id, thread_type, thread_id, sender_id, receiver_id, body, read_at, created_at',
    )
    .single();

  if (error || !data) {
    throw new Error("Impossible d'envoyer le message.");
  }

  return mapMessage(data as MessageRow);
}

/**
 * Liste les messages d'un fil, du plus ancien au plus récent.
 */
export async function getMessages(
  threadType: ChatThreadType,
  threadId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(
      'id, thread_type, thread_id, sender_id, receiver_id, body, read_at, created_at',
    )
    .eq('thread_type', threadType)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Impossible de charger les messages.');
  }

  return ((data as MessageRow[] | null) ?? []).map(mapMessage);
}

/**
 * Marque comme lus les messages reçus non lus de ce fil.
 */
export async function markThreadRead(
  threadType: ChatThreadType,
  threadId: string,
): Promise<void> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return;
  }

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_type', threadType)
    .eq('thread_id', threadId)
    .eq('receiver_id', userId)
    .is('read_at', null);

  if (error) {
    // Ne pas faire planter l'UI pour un marquage de lecture
    console.warn('[chat] markThreadRead:', error.message);
  }
}
