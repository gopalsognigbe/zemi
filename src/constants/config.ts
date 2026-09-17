export const CURRENCY = 'FCFA';

export const DEFAULT_CITY = 'Cotonou';

/** Le cash est le mode par défaut pour les courses */
export const DEFAULT_PAYMENT_METHOD = 'cash' as const;

/** En dessous de ce seuil, la note d'un conducteur est considérée comme neutre */
export const MIN_RATINGS_BEFORE_COUNT = 5;

/**
 * Facteurs ETA / distance routière.
 * DOIVENT rester IDENTIQUES à ceux de l'Edge Function « compute-fare »
 * (Haversine × 1.3, vitesse 20 km/h), sinon le prix et l'ETA se contrediront.
 */
export const DETOUR_FACTOR = 1.3;
export const AVG_SPEED_KMH = 20;
/** On n'affiche jamais moins d'une minute */
export const MIN_ETA_MIN = 1;
