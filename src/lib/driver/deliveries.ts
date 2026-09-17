import { supabase } from '@/lib/supabase';
import type { DeliveryStatus } from '@/types';

export interface DriverDeliveryRow {
  id: string;
  sender_id: string;
  driver_id: string | null;
  delivery_type: 'livraison_simple' | 'livraison_express';
  pickup_lat: number;
  pickup_lng: number;
  pickup_label: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_label: string;
  recipient_phone: string;
  package_description: string;
  package_photo_url: string | null;
  status: DeliveryStatus;
  driver_payout: number | null;
  total_price: number | null;
  created_at: string;
}

const DELIVERY_COLUMNS =
  'id, sender_id, driver_id, delivery_type, pickup_lat, pickup_lng, pickup_label, dropoff_lat, dropoff_lng, dropoff_label, recipient_phone, package_description, package_photo_url, status, driver_payout, total_price, created_at';

/** Livraison active du zem (assignée ou colis récupéré). */
export async function fetchActiveDelivery(
  driverId: string,
): Promise<{ delivery: DriverDeliveryRow | null; error?: string }> {
  const { data, error } = await supabase
    .from('deliveries')
    .select(DELIVERY_COLUMNS)
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'picked_up'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      delivery: null,
      error: 'Impossible de charger la livraison active.',
    };
  }

  return { delivery: (data as DriverDeliveryRow | null) ?? null };
}

/** Livraisons en attente d’un zem. */
export async function fetchCreatedDeliveries(): Promise<{
  deliveries: DriverDeliveryRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from('deliveries')
    .select(DELIVERY_COLUMNS)
    .eq('status', 'created')
    .order('created_at', { ascending: true });

  if (error) {
    return {
      deliveries: [],
      error: 'Impossible de charger les livraisons disponibles.',
    };
  }

  return { deliveries: (data as DriverDeliveryRow[]) ?? [] };
}

/**
 * Réclamation atomique : ne réussit que si la livraison est encore « created ».
 */
export async function claimDelivery(
  deliveryId: string,
  driverId: string,
): Promise<{
  delivery: DriverDeliveryRow | null;
  alreadyTaken: boolean;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('deliveries')
    .update({ driver_id: driverId, status: 'assigned' })
    .eq('id', deliveryId)
    .eq('status', 'created')
    .select(DELIVERY_COLUMNS);

  if (error) {
    return {
      delivery: null,
      alreadyTaken: false,
      error: 'Impossible d’accepter la livraison. Réessayez.',
    };
  }

  const rows = (data as DriverDeliveryRow[] | null) ?? [];
  if (rows.length === 0) {
    return { delivery: null, alreadyTaken: true };
  }

  return { delivery: rows[0], alreadyTaken: false };
}

/** Marque le colis comme récupéré (assigned → picked_up). */
export async function markDeliveryPickedUp(
  deliveryId: string,
): Promise<{ delivery: DriverDeliveryRow | null; error?: string }> {
  const { data, error } = await supabase
    .from('deliveries')
    .update({ status: 'picked_up' })
    .eq('id', deliveryId)
    .eq('status', 'assigned')
    .select(DELIVERY_COLUMNS);

  if (error) {
    return {
      delivery: null,
      error: 'Impossible de marquer le colis comme récupéré.',
    };
  }

  const rows = (data as DriverDeliveryRow[] | null) ?? [];
  if (rows.length === 0) {
    return {
      delivery: null,
      error: 'Cette livraison n’est plus disponible à cette étape.',
    };
  }

  return { delivery: rows[0] };
}

/**
 * Termine la livraison via RPC sécurisée (code destinataire + crédit zem).
 * Remplace complete_delivery (sans code).
 * Ne sélectionne jamais delivery_code côté zem.
 */
export async function completeDeliveryWithCode(
  deliveryId: string,
  code: string,
): Promise<{ error?: string; wrongCode?: boolean }> {
  const { error } = await supabase.rpc('complete_delivery_with_code', {
    p_delivery_id: deliveryId,
    p_code: code,
  });

  if (!error) return {};

  const msg = (error.message || '').toUpperCase();
  console.warn('[driver] complete_delivery_with_code:', error.message);

  if (msg.includes('WRONG_CODE')) {
    return {
      wrongCode: true,
      error: 'Code incorrect. Vérifiez auprès du destinataire.',
    };
  }
  if (msg.includes('INVALID_STATUS')) {
    return {
      error: 'Marquez d’abord le colis comme récupéré avant de livrer.',
    };
  }
  if (msg.includes('NOT_YOUR_DELIVERY')) {
    return { error: 'Vous n’êtes pas le zem de cette livraison.' };
  }
  return { error: 'Impossible de terminer la livraison. Réessayez.' };
}

export function deliveryTypeLabel(
  type: DriverDeliveryRow['delivery_type'],
): string {
  return type === 'livraison_express' ? 'Express' : 'Simple';
}
