import { supabase } from '@/lib/supabase';

export type DeliveryType = 'livraison_simple' | 'livraison_express';

export interface CreateDeliveryPayload {
  deliveryType: DeliveryType;
  pickup: { lat: number; lng: number };
  pickupLabel: string;
  dropoff: { lat: number; lng: number };
  dropoffLabel: string;
  recipientPhone: string;
  packageDescription: string;
  packagePhotoUrl: string;
}

export interface CreateDeliveryResult {
  deliveryId: string;
  totalPrice: number;
}

export class InsufficientBalanceError extends Error {
  readonly code = 'INSUFFICIENT' as const;

  constructor(message = 'Solde insuffisant') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

function isInsufficient(message: string, status?: number): boolean {
  if (status === 402) return true;
  return message.toLowerCase().includes('solde insuffisant');
}

async function readFunctionError(error: unknown): Promise<{
  status?: number;
  message: string;
}> {
  const err = error as {
    message?: string;
    context?: Response | { status?: number };
  };

  let status: number | undefined;
  let message = err.message || 'Échec de la création.';

  if (err.context instanceof Response) {
    status = err.context.status;
    try {
      const json = (await err.context.clone().json()) as { error?: string };
      if (json?.error) message = String(json.error);
    } catch {
      // ignore parse errors
    }
  } else if (err.context && typeof err.context === 'object' && 'status' in err.context) {
    status = err.context.status;
  }

  return { status, message };
}

/**
 * Crée une livraison prépayée via Edge Function (prix + débit + insert côté serveur).
 */
export async function createDelivery(
  payload: CreateDeliveryPayload,
): Promise<CreateDeliveryResult> {
  const { data, error } = await supabase.functions.invoke('create-delivery', {
    body: payload,
  });

  const dataError =
    data && typeof data === 'object' && 'error' in data
      ? String((data as { error: unknown }).error)
      : '';

  if (error) {
    const parsed = await readFunctionError(error);
    const msg = dataError || parsed.message;
    if (isInsufficient(msg, parsed.status)) {
      throw new InsufficientBalanceError('Solde insuffisant');
    }
    // Message serveur utile (fonction non déployée, etc.)
    if (msg.toLowerCase().includes('failed to send') || msg.toLowerCase().includes('fetch')) {
      throw new Error(
        'Fonction create-delivery inaccessible. Vérifiez qu’elle est bien déployée.',
      );
    }
    throw new Error(msg || 'Impossible de créer la livraison. Réessayez.');
  }

  if (dataError) {
    if (isInsufficient(dataError)) {
      throw new InsufficientBalanceError('Solde insuffisant');
    }
    throw new Error(dataError);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Impossible de créer la livraison. Réessayez.');
  }

  const result = data as CreateDeliveryResult;
  if (!result.deliveryId || typeof result.totalPrice !== 'number') {
    throw new Error('Impossible de créer la livraison. Réessayez.');
  }

  return result;
}
