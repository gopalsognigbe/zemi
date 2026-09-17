import { supabase } from '@/lib/supabase';

export const CANCEL_REASONS = [
  "J'ai changé d'avis",
  'Le zem est trop loin',
  "Trop d'attente",
  "Erreur d'adresse",
  'Autre',
] as const;

export const REPORT_REASONS = [
  'Comportement inapproprié',
  'Conduite dangereuse',
  'Colis endommagé',
  "Ne s'est jamais présenté",
  'Autre',
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type MissionJobType = 'ride' | 'delivery';

function mapMissionError(message: string, fallback: string): string {
  const upper = message.toUpperCase();
  if (upper.includes('TOO_LATE')) {
    return 'Trop tard pour annuler : la mission a déjà commencé.';
  }
  if (upper.includes('NOT_YOURS')) {
    return 'Cette mission ne vous appartient pas.';
  }
  if (upper.includes('NOT_FOUND')) {
    return 'Mission introuvable.';
  }
  return fallback;
}

/**
 * Annule une course côté client (remboursement géré par la RPC).
 */
export async function cancelRide(
  rideId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc('client_cancel_ride', {
    p_ride_id: rideId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(
      mapMissionError(error.message || '', "Impossible d'annuler la course."),
    );
  }
}

/**
 * Annule une livraison côté client ; renvoie le montant remboursé (FCFA).
 */
export async function cancelDelivery(
  deliveryId: string,
  reason: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('client_cancel_delivery', {
    p_delivery_id: deliveryId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(
      mapMissionError(
        error.message || '',
        "Impossible d'annuler la livraison.",
      ),
    );
  }

  if (typeof data === 'number') {
    return data;
  }

  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>;
    const amount =
      row.refunded_amount ??
      row.refund_amount ??
      row.amount ??
      row.refundedAmount;
    if (typeof amount === 'number') {
      return amount;
    }
    if (typeof amount === 'string' && amount !== '') {
      return Number(amount) || 0;
    }
  }

  return Number(data) || 0;
}

/**
 * Signale un problème sur une mission (course ou livraison).
 */
export async function reportIssue(params: {
  targetId: string;
  jobType: MissionJobType;
  jobId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Vous devez être connecté pour signaler un problème.');
  }

  const trimmedDetails = params.details?.trim() || null;

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_id: params.targetId,
    job_type: params.jobType,
    job_id: params.jobId,
    reason: params.reason,
    details: trimmedDetails,
  });

  if (error) {
    throw new Error("Impossible d'envoyer le signalement.");
  }
}
