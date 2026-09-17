import { supabase } from '@/lib/supabase';

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  driverId: string;
  amount: number;
  momoNumber: string;
  status: WithdrawalStatus;
  createdAt: string;
}

interface WithdrawalRow {
  id: string;
  driver_id: string;
  amount: number;
  momo_number: string;
  status: WithdrawalStatus;
  created_at: string;
}

function mapWithdrawalError(message: string): string {
  const upper = message.toUpperCase();
  if (upper.includes('INSUFFICIENT_BALANCE')) {
    return 'Solde insuffisant.';
  }
  if (upper.includes('INVALID_AMOUNT')) {
    return 'Montant invalide.';
  }
  if (upper.includes('INVALID_NUMBER')) {
    return 'Numéro Mobile Money invalide.';
  }
  return 'Échec de la demande de retrait.';
}

/**
 * Demande un retrait Mobile Money (RPC atomique côté serveur).
 */
export async function requestWithdrawal(
  amount: number,
  momoNumber: string,
): Promise<void> {
  const { error } = await supabase.rpc('request_withdrawal', {
    p_amount: amount,
    p_momo_number: momoNumber,
  });

  if (error) {
    throw new Error(mapWithdrawalError(error.message || ''));
  }
}

/**
 * Demandes de retrait du zem connecté (plus récentes en premier).
 */
export async function getWithdrawals(): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('id, driver_id, amount, momo_number, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Impossible de charger les demandes de retrait.');
  }

  const rows = (data as WithdrawalRow[] | null) ?? [];
  return rows.map((row) => ({
    id: row.id,
    driverId: row.driver_id,
    amount: Number(row.amount) || 0,
    momoNumber: row.momo_number,
    status: row.status,
    createdAt: row.created_at,
  }));
}
