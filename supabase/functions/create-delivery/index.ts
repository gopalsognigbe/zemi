import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type DeliveryType = 'livraison_simple' | 'livraison_express';

interface LatLng {
  lat: number;
  lng: number;
}

interface TimeBand {
  label: string;
  fromHour: number;
  toHour: number;
  multiplier: number;
}

interface PricingConfig {
  baseFare: number;
  pricePerKm: number;
  pricePerMin: number;
  minFare: number;
  roundingStep: number;
  commissionRate: number;
  commissionFlat: number;
  weatherMultipliers: Record<string, number>;
  timeBands: TimeBand[];
  zoneMultipliers: Record<string, number>;
}

interface CreateDeliveryBody {
  deliveryType: DeliveryType;
  pickup: LatLng;
  pickupLabel: string;
  dropoff: LatLng;
  dropoffLabel: string;
  recipientPhone: string;
  packageDescription: string;
  packagePhotoUrl: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function getTimeMultiplier(hour: number, bands: TimeBand[]): number {
  for (const b of bands) {
    const inBand =
      b.fromHour <= b.toHour
        ? hour >= b.fromHour && hour < b.toHour
        : hour >= b.fromHour || hour < b.toHour;
    if (inBand) return b.multiplier;
  }
  return 1.0;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function isValidLatLng(point: unknown): point is LatLng {
  if (!point || typeof point !== 'object') return false;
  const p = point as Record<string, unknown>;
  return typeof p.lat === 'number' && typeof p.lng === 'number';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée. Utilisez POST.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: 'Variables d’environnement Supabase manquantes.' },
        500,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Non authentifié.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey ?? serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Non authentifié.' }, 401);
    }

    const body = (await req.json()) as CreateDeliveryBody;
    const allowed: DeliveryType[] = ['livraison_simple', 'livraison_express'];

    if (!body?.deliveryType || !allowed.includes(body.deliveryType)) {
      return jsonResponse(
        { error: 'deliveryType invalide (livraison_simple | livraison_express).' },
        400,
      );
    }

    if (!isValidLatLng(body.pickup) || !isValidLatLng(body.dropoff)) {
      return jsonResponse(
        { error: 'pickup et dropoff sont obligatoires ({ lat, lng }).' },
        400,
      );
    }

    if (!body.pickupLabel?.trim() || !body.dropoffLabel?.trim()) {
      return jsonResponse({ error: 'Les libellés de lieux sont obligatoires.' }, 400);
    }

    if (!body.recipientPhone?.trim()) {
      return jsonResponse({ error: 'Le numéro du destinataire est obligatoire.' }, 400);
    }

    if (!body.packageDescription?.trim()) {
      return jsonResponse({ error: 'La description du colis est obligatoire.' }, 400);
    }

    if (!body.packagePhotoUrl?.trim()) {
      return jsonResponse({ error: 'La photo du colis est obligatoire.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Prix côté serveur (source de vérité)
    const { data: pricingRow, error: pricingError } = await admin
      .from('pricing_config')
      .select(
        'base_fare, price_per_km, price_per_min, min_fare, rounding_step, commission_rate, commission_flat, weather_multipliers, time_bands, zone_multipliers',
      )
      .eq('profile', body.deliveryType)
      .maybeSingle();

    if (pricingError || !pricingRow) {
      return jsonResponse({ error: 'Configuration tarifaire introuvable.' }, 400);
    }

    const cfg: PricingConfig = {
      baseFare: Number(pricingRow.base_fare),
      pricePerKm: Number(pricingRow.price_per_km),
      pricePerMin: Number(pricingRow.price_per_min),
      minFare: Number(pricingRow.min_fare),
      roundingStep: Number(pricingRow.rounding_step),
      commissionRate: Number(pricingRow.commission_rate),
      commissionFlat: Number(pricingRow.commission_flat),
      weatherMultipliers: pricingRow.weather_multipliers ?? {},
      timeBands: pricingRow.time_bands ?? [],
      zoneMultipliers: pricingRow.zone_multipliers ?? {},
    };

    const distanceKm = haversineKm(body.pickup, body.dropoff) * 1.3;
    const durationMin = (distanceKm / 20) * 60;
    const hour = new Date(Date.now() + 3600 * 1000).getUTCHours();

    const subtotal =
      cfg.baseFare +
      distanceKm * cfg.pricePerKm +
      durationMin * cfg.pricePerMin;
    const weatherMult = cfg.weatherMultipliers['normal'] ?? 1.0;
    const timeMult = getTimeMultiplier(hour, cfg.timeBands);
    const zoneMult = cfg.zoneMultipliers['default'] ?? 1.0;
    const payoutBeforeRounding = subtotal * weatherMult * timeMult * zoneMult;
    const driverPayout = roundToStep(
      Math.max(payoutBeforeRounding, cfg.minFare),
      cfg.roundingStep,
    );
    const rawCommission =
      driverPayout * cfg.commissionRate + cfg.commissionFlat;
    const totalPrice = roundToStep(
      driverPayout + rawCommission,
      cfg.roundingStep,
    );
    const zemiCommission = totalPrice - driverPayout;

    // Solde
    const { data: wallet, error: walletError } = await admin
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError) {
      return jsonResponse({ error: walletError.message }, 500);
    }

    const balance = wallet ? Number(wallet.balance) || 0 : 0;
    if (balance < totalPrice) {
      return jsonResponse({ error: 'Solde insuffisant' }, 402);
    }

    const newBalance = balance - totalPrice;

    const { data: delivery, error: deliveryError } = await admin
      .from('deliveries')
      .insert({
        sender_id: user.id,
        delivery_type: body.deliveryType,
        pickup_lat: body.pickup.lat,
        pickup_lng: body.pickup.lng,
        pickup_label: body.pickupLabel.trim(),
        dropoff_lat: body.dropoff.lat,
        dropoff_lng: body.dropoff.lng,
        dropoff_label: body.dropoffLabel.trim(),
        recipient_phone: body.recipientPhone.trim(),
        package_description: body.packageDescription.trim(),
        package_photo_url: body.packagePhotoUrl.trim(),
        status: 'created',
        driver_payout: driverPayout,
        zemi_commission: zemiCommission,
        total_price: totalPrice,
      })
      .select('id')
      .single();

    if (deliveryError || !delivery) {
      return jsonResponse(
        { error: deliveryError?.message ?? 'Impossible de créer la livraison.' },
        500,
      );
    }

    const { error: updateWalletError } = await admin
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateWalletError) {
      // Annuler la livraison si le débit échoue
      await admin.from('deliveries').delete().eq('id', delivery.id);
      return jsonResponse({ error: updateWalletError.message }, 500);
    }

    const { error: txError } = await admin.from('wallet_transactions').insert({
      user_id: user.id,
      amount: totalPrice,
      type: 'delivery_payment',
      ref_id: delivery.id,
    });

    if (txError) {
      // Best-effort : livraison + débit déjà faits
      console.error('wallet_transactions insert failed', txError.message);
    }

    return jsonResponse({
      deliveryId: delivery.id,
      totalPrice,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur interne inattendue.';
    return jsonResponse({ error: message }, 500);
  }
});
