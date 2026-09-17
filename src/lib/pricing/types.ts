export type PricingProfile = 'course' | 'livraison_simple' | 'livraison_express';

export interface TimeBand {
  label: string;
  fromHour: number;   // 0-23, inclus
  toHour: number;     // 0-23, exclu. Si fromHour > toHour, la plage passe minuit.
  multiplier: number;
}

export interface PricingConfig {
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

export interface FareInput {
  distanceKm: number;
  durationMin: number;
  weather: string;
  hour: number;
  zoneId: string;
}

export interface FareResult {
  driverPayout: number;
  zemiCommission: number;
  totalPrice: number;
  profile: PricingProfile;
  breakdown: {
    base: number; distance: number; time: number; subtotal: number;
    weatherMult: number; timeMult: number; zoneMult: number; payoutBeforeRounding: number;
  };
}
