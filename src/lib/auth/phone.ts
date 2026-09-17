/**
 * Normalise un numéro béninois : chiffres uniquement, préfixe 229 si absent.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('229')) {
    return digits;
  }
  return `229${digits}`;
}

/**
 * Convertit un numéro en email synthétique interne (jamais montré à l'utilisateur).
 */
export function toSyntheticEmail(raw: string): string {
  return `${normalizePhone(raw)}@zemi.app`;
}
