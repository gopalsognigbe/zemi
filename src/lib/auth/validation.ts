export function validateFullName(fullName: string): string | null {
  if (!fullName.trim()) {
    return 'Le nom complet est obligatoire.';
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) {
    return 'Le numéro de téléphone doit contenir au moins 8 chiffres.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  return null;
}
