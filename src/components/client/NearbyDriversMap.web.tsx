import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { Button } from '@/components/ui/Button';
import { theme as staticTheme, useTheme } from '@/constants/theme';
import { fetchNearbyDrivers } from '@/lib/driver/nearbyDrivers';
import { getCurrentPosition } from '@/lib/geo/location';
import type { LatLng } from '@/types';

import { COTONOU_CENTER } from '../shared/mapShared';

const REFRESH_MS = 20_000;

function driversLabel(count: number): string {
  if (count === 0) return 'Aucun zem disponible autour de vous';
  if (count === 1) return '1 zem disponible autour de vous';
  return `${count} zems disponibles autour de vous`;
}

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

  const caption = (
    <View style={styles.captionRow}>
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
      <View style={styles.wrapper}>
        <View
          style={{
            minHeight: mapHeight,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            justifyContent: 'center',
            ...theme.shadow.soft,
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textPrimary,
              textAlign: 'center',
              marginBottom: theme.spacing.sm,
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
    <View style={styles.wrapper}>
      <View
        style={{
          minHeight: mapHeight,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
          justifyContent: 'center',
          ...theme.shadow.soft,
        }}>
        <Text
          style={{
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.typography.subtitle.fontSize,
            color: theme.mode === 'dark' ? theme.colors.green300 : theme.colors.green700,
            marginBottom: theme.spacing.sm,
            textAlign: 'center',
          }}>
          Zems autour de vous
        </Text>
        {loading ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              color: theme.colors.textSecondary,
              textAlign: 'center',
            }}>
            Chargement…
          </Text>
        ) : userPosition ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              color: theme.colors.textSecondary,
              textAlign: 'center',
              marginBottom: theme.spacing.xs,
            }}>
            Votre position : {userPosition.lat.toFixed(4)},{' '}
            {userPosition.lng.toFixed(4)}
          </Text>
        ) : null}
        {drivers.length > 0
          ? drivers.slice(0, 5).map((d, i) => (
              <Text
                key={`d-${i}`}
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  fontSize: theme.typography.caption.fontSize,
                  color: theme.colors.textPrimary,
                  textAlign: 'center',
                  marginTop: 2,
                }}>
                Zem à ~{d.lat.toFixed(3)}, {d.lng.toFixed(3)}
              </Text>
            ))
          : null}
      </View>
      {caption}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: staticTheme.spacing.sm,
  },
});
