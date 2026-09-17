import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PricingProfile = 'course' | 'livraison_simple' | 'livraison_express';

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
  profile: PricingProfile;
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

interface PricingConfigRow {
  profile: PricingProfile;
  base_fare: number;
  price_per_km: number;
  price_per_min: number;
  min_fare: number;
  rounding_step: number;
  commission_rate: number;
  commission_flat: number;
  weather_multipliers: Record<string, number>;
  time_bands: TimeBand[];
  zone_multipliers: Record<string, number>;
}

interface FareRequestBody {
  profile: PricingProfile;
  pickup: LatLng;
  destination: LatLng;
  weather?: string;
  zoneId?: string;
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

/** Distance à vol d'oiseau entre deux points (km). */
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

function mapConfigRow(row: PricingConfigRow): PricingConfig {
  return {
    profile: row.profile,
    baseFare: Number(row.base_fare),
    pricePerKm: Number(row.price_per_km),
    pricePerMin: Number(row.price_per_min),
    minFare: Number(row.min_fare),
    roundingStep: Number(row.rounding_step),
    commissionRate: Number(row.commission_rate),
    commissionFlat: Number(row.commission_flat),
    weatherMultipliers: row.weather_multipliers ?? {},
    timeBands: row.time_bands ?? [],
    zoneMultipliers: row.zone_multipliers ?? {},
  };
}

function isValidLatLng(point: unknown): point is LatLng {
  if (!point || typeof point !== 'object') return false;
  const p = point as Record<string, unknown>;
  return typeof p.lat === 'number' && typeof p.lng === 'number';
}

Deno.serve(async (req) => {
  // Préflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée. Utilisez POST.' }, 405);
  }

  try {
    const body = (await req.json()) as FareRequestBody;

    const allowedProfiles: PricingProfile[] = [
      'course',
      'livraison_simple',
      'livraison_express',
    ];

    if (!body?.profile || !allowedProfiles.includes(body.profile)) {
      return jsonResponse(
        {
          error:
            'profile invalide. Attendu : course | livraison_simple | livraison_express.',
        },
        400,
      );
    }

    if (!isValidLatLng(body.pickup) || !isValidLatLng(body.destination)) {
      return jsonResponse(
        {
          error:
            'pickup et destination sont obligatoires (objets { lat, lng }).',
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: 'Variables d’environnement Supabase manquantes.' },
        500,
      );
    }

    // Service role : lit pricing_config en contournant la RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from('pricing_config')
      .select(
        'profile, base_fare, price_per_km, price_per_min, min_fare, rounding_step, commission_rate, commission_flat, weather_multipliers, time_bands, zone_multipliers',
      )
      .eq('profile', body.profile)
      .maybeSingle();

    if (error) {
      return jsonResponse(
        { error: `Erreur lecture pricing_config : ${error.message}` },
        500,
      );
    }

    if (!data) {
      return jsonResponse(
        { error: `Aucune configuration pour le profil « ${body.profile} ».` },
        400,
      );
    }

    const cfg = mapConfigRow(data as PricingConfigRow);

    // Distance routière approximée (Haversine × 1.3)
    const distanceKm = haversineKm(body.pickup, body.destination) * 1.3;
    // Vitesse moyenne d’un zem en ville ~20 km/h
    const durationMin = (distanceKm / 20) * 60;

    const weather = body.weather ?? 'normal';
    // Heure actuelle au Bénin (UTC+1)
    const hour = new Date(Date.now() + 3600 * 1000).getUTCHours();
    const zoneId = body.zoneId ?? 'default';

    const base = cfg.baseFare;
    const distance = distanceKm * cfg.pricePerKm;
    const time = durationMin * cfg.pricePerMin;
    const subtotal = base + distance + time;

    const weatherMult = cfg.weatherMultipliers[weather] ?? 1.0;
    const timeMult = getTimeMultiplier(hour, cfg.timeBands);
    const zoneMult = cfg.zoneMultipliers[zoneId] ?? 1.0;

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

    return jsonResponse({
      driverPayout,
      zemiCommission,
      totalPrice,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round(durationMin),
      profile: cfg.profile,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur interne inattendue.';
    return jsonResponse({ error: message }, 500);
  }
});
