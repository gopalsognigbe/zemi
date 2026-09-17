import type { FareInput, FareResult, PricingConfig, TimeBand } from './types';

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

// FONCTION PURE : mêmes entrées => même sortie. Aucun appel réseau.
export function computeFare(input: FareInput, config: PricingConfig): FareResult {
  const base = config.baseFare;
  const distance = input.distanceKm * config.pricePerKm;
  const time = input.durationMin * config.pricePerMin;
  const subtotal = base + distance + time;

  const weatherMult = config.weatherMultipliers[input.weather] ?? 1.0;
  const timeMult = getTimeMultiplier(input.hour, config.timeBands);
  const zoneMult = config.zoneMultipliers[input.zoneId] ?? 1.0;

  const payoutBeforeRounding = subtotal * weatherMult * timeMult * zoneMult;

  const driverPayout = roundToStep(Math.max(payoutBeforeRounding, config.minFare), config.roundingStep);
  const rawCommission = driverPayout * config.commissionRate + config.commissionFlat;
  const totalPrice = roundToStep(driverPayout + rawCommission, config.roundingStep);
  const zemiCommission = totalPrice - driverPayout;

  return {
    driverPayout, zemiCommission, totalPrice, profile: config.profile,
    breakdown: { base, distance, time, subtotal, weatherMult, timeMult, zoneMult, payoutBeforeRounding },
  };
}
