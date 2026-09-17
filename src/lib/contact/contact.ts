import { Alert, Linking } from 'react-native';

import { normalizePhone } from '@/lib/auth/phone';

/**
 * Lance un appel téléphonique vers un numéro béninois.
 * Normalise en +229… ; affiche un message FR si l'appel est impossible.
 */
export async function callNumber(phone: string): Promise<void> {
  const digits = normalizePhone(phone);
  if (!digits || digits.length < 11) {
    Alert.alert(
      'Appel impossible',
      'Le numéro de téléphone est invalide ou manquant.',
    );
    return;
  }

  const telUrl = `tel:+${digits}`;

  try {
    const supported = await Linking.canOpenURL(telUrl);
    if (!supported) {
      Alert.alert(
        'Appel impossible',
        "Votre appareil ne peut pas passer d'appel téléphonique.",
      );
      return;
    }

    await Linking.openURL(telUrl);
  } catch {
    Alert.alert(
      'Appel impossible',
      "Impossible d'ouvrir l'application Téléphone.",
    );
  }
}
