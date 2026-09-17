import * as Location from 'expo-location';

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export class LocationPermissionError extends Error {
  constructor(message = 'Permission de localisation refusée.') {
    super(message);
    this.name = 'LocationPermissionError';
  }
}

/**
 * Demande la permission puis renvoie la position actuelle avec un label lisible.
 */
export async function getCurrentPosition(): Promise<GeoPoint> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new LocationPermissionError(
      'Permission de localisation refusée. Activez-la dans les réglages pour commander une course.',
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  let label = 'Ma position';

  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const place = places[0];
    if (place) {
      const parts = [place.street, place.streetNumber, place.city || place.subregion || place.region]
        .filter(Boolean)
        .map(String);
      if (parts.length > 0) {
        label = parts.join(', ');
      } else if (place.name) {
        label = place.name;
      }
    }
  } catch {
    // Reverse géocode indisponible : on garde « Ma position »
  }

  return { lat, lng, label };
}

/**
 * Géocode une adresse libre. Renvoie le premier résultat ou null.
 */
export async function geocodeAddress(
  text: string,
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const results = await Location.geocodeAsync(trimmed);
  const first = results[0];
  if (!first) return null;

  return { lat: first.latitude, lng: first.longitude };
}

/** Adresse lisible à partir de coordonnées (géocodage inverse). */
export async function reverseGeocodeLabel(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    const place = places[0];
    if (place) {
      const parts = [
        place.street,
        place.streetNumber,
        place.city || place.subregion || place.region,
      ]
        .filter(Boolean)
        .map(String);
      if (parts.length > 0) return parts.join(', ');
      if (place.name) return place.name;
    }
  } catch {
    // ignore
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
