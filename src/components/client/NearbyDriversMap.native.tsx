import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/constants/theme';
import { fetchNearbyDrivers } from '@/lib/driver/nearbyDrivers';
import { getCurrentPosition } from '@/lib/geo/location';
import type { LatLng } from '@/types';

import { COTONOU_CENTER } from '../shared/mapShared';
import { buildOsmMapHtml } from '../shared/osmMapHtml';

const REFRESH_MS = 20_000;

function driversLabel(count: number): string {
  if (count === 0) return 'Aucun zem disponible autour de vous';
  if (count === 1) return '1 zem disponible autour de vous';
  return `${count} zems disponibles autour de vous`;
}

/**
 * Carte des zems proches (OpenStreetMap).
 * Google Maps ne charge plus dans Expo Go — OSM via WebView.
 */
export function NearbyDriversMap() {
  const theme = useTheme();
  const mapHeight = theme.layout.homeMapHeight;
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [drivers, setDrivers] = useState<LatLng[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userPositionRef = useRef<LatLng | null>(null);

  const loadDrivers = useCallback(async (lat: number, lng: number) => {
    try {
      const nearby = await fetchNearbyDrivers(lat, lng, 5);
      setDrivers(nearby);
    } catch {
      setDrivers([]);
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const pos = await getCurrentPosition();
      const point = { lat: pos.lat, lng: pos.lng };
      userPositionRef.current = point;
      setUserPosition(point);
      setPermissionDenied(false);
      await loadDrivers(pos.lat, pos.lng);
    } catch {
      setPermissionDenied(true);
      userPositionRef.current = COTONOU_CENTER;
      setUserPosition(COTONOU_CENTER);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [loadDrivers]);

  useEffect(() => {
    void init();

    intervalRef.current = setInterval(() => {
      const pos = userPositionRef.current;
      if (pos) {
        void loadDrivers(pos.lat, pos.lng);
      }
    }, REFRESH_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [init, loadDrivers]);

  async function handleAllowLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      await init();
    }
  }

  const center = userPosition ?? COTONOU_CENTER;
  const html = useMemo(
    () =>
      buildOsmMapHtml({
        lat: center.lat,
        lng: center.lng,
        zoom: 14,
        accentHex: theme.colors.green500,
        showCenterDot: true,
        markers: drivers.map((d) => ({
          lat: d.lat,
          lng: d.lng,
          color: theme.colors.amber500,
        })),
      }),
    [center.lat, center.lng, drivers, theme.colors.amber500, theme.colors.green500],
  );

  const caption = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
      }}>
      <View
        style={{
          width: theme.spacing.sm,
          height: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.green500,
          marginRight: theme.spacing.sm,
        }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: theme.fonts.jakartaRegular,
          fontSize: theme.layout.homeCaption,
          lineHeight: theme.layout.homeCaption + theme.spacing.xs,
          color: theme.colors.textSecondary,
        }}>
        {driversLabel(permissionDenied ? 0 : drivers.length)}
      </Text>
    </View>
  );

  if (permissionDenied) {
    return (
      <View>
        <View
          style={{
            height: mapHeight,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            justifyContent: 'center',
            gap: theme.spacing.sm,
            ...theme.shadow.soft,
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              color: theme.colors.textPrimary,
              textAlign: 'center',
            }}>
            Autorisez la localisation pour voir les zems autour de vous.
          </Text>
          <Button label="Autoriser la localisation" onPress={handleAllowLocation} />
        </View>
        {caption}
      </View>
    );
  }

  return (
    <View>
      <View
        style={{
          height: mapHeight,
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          ...theme.shadow.soft,
        }}>
        {loading && !userPosition ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surface,
            }}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                color: theme.colors.textSecondary,
              }}>
              Chargement de la carte…
            </Text>
          </View>
        ) : (
          <WebView
            key={`${center.lat.toFixed(4)}-${center.lng.toFixed(4)}-${drivers.length}`}
            originWhitelist={['*']}
            source={{ html }}
            style={{ flex: 1, backgroundColor: theme.colors.border }}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            setSupportMultipleWindows={false}
          />
        )}
      </View>
      {caption}
    </View>
  );
}
