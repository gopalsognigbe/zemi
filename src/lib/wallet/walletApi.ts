import { supabase } from '@/lib/supabase';

export type WalletTxType =
  | 'topup'
  | 'ride_payment'
  | 'delivery_payment'
  | 'earning'
  | 'commission'
  | 'withdrawal'
  | 'refund'
  | 'adjustment';

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: WalletTxType;
  refId?: string;
  createdAt: string;
}

interface WalletRow {
  balance: number;
}

interface WalletTxRow {
  id: string;
  user_id: string;
  amount: number;
  type: WalletTxType;
  ref_id: string | null;
  created_at: string;
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Vous devez être connecté.');
  }

  return user.id;
}

/**
 * Recharge simulée via Edge Function (service role côté serveur).
 */
export async function topUp(amount: number): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Le montant doit être supérieur à 0.');
  }

  const { data, error } = await supabase.functions.invoke('wallet-topup', {
    body: { amount },
  });

  if (error) {
    throw new Error('Échec de la recharge.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Échec de la recharge.');
  }

  if ('error' in data && data.error) {
    throw new Error(String(data.error) || 'Échec de la recharge.');
  }

  const balance = Number((data as { balance?: unknown }).balance);
  if (!Number.isFinite(balance)) {
    throw new Error('Échec de la recharge.');
  }

  return balance;
}

/**
 * Lit le solde du portefeuille de l’utilisateur connecté.
 */
export async function getWallet(): Promise<number> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error('Impossible de charger le solde.');
  }

  if (!data) {
    return 0;
  }

  return Number((data as WalletRow).balance) || 0;
}

/**
 * Historique des transactions (plus récentes en premier).
 */
export async function getTransactions(): Promise<WalletTransaction[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id, user_id, amount, type, ref_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Impossible de charger l’historique.');
  }

  const rows = (data as WalletTxRow[] | null) ?? [];
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount) || 0,
    type: row.type,
    refId: row.ref_id ?? undefined,
    createdAt: row.created_at,
  }));
}
