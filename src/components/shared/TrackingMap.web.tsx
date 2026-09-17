import { StyleSheet, Text, View } from 'react-native';

import { theme, typography } from '@/constants/theme';

import {
  MAP_HEIGHT,
  useSmoothedPosition,
  type TrackingMapProps,
} from './trackingMapShared';

export type { TrackingMapProps } from './trackingMapShared';

export function TrackingMap({
  pickup,
  destination,
  driverPosition,
  pickupLabel = 'Départ',
  destinationLabel = 'Destination',
  height = MAP_HEIGHT,
}: TrackingMapProps) {
  const smoothedDriver = useSmoothedPosition(driverPosition);
  const fill = height === 'fill';

  return (
    <View
      style={[
        styles.wrapper,
        fill
          ? styles.fill
          : { height: typeof height === 'number' ? height : MAP_HEIGHT },
      ]}>
      <View style={styles.webFallback}>
        <Text style={styles.webTitle}>Carte de suivi</Text>
        <Text style={styles.webLine}>
          {pickupLabel} : {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}
        </Text>
        <Text style={styles.webLine}>
          {destinationLabel} : {destination.lat.toFixed(4)},{' '}
          {destination.lng.toFixed(4)}
        </Text>
        {smoothedDriver ? (
          <Text style={styles.webDriver}>
            Votre zem : {smoothedDriver.lat.toFixed(4)},{' '}
            {smoothedDriver.lng.toFixed(4)}
          </Text>
        ) : (
          <Text style={styles.webMuted}>En attente de la position du zem…</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  fill: {
    ...StyleSheet.absoluteFill,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  webFallback: {
    flex: 1,
    backgroundColor: theme.colors.amberSoft,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  webTitle: {
    ...typography('subtitle'),
    color: theme.colors.greenDark,
    marginBottom: theme.spacing.sm,
  },
  webLine: {
    ...typography('body'),
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  webDriver: {
    ...typography('body'),
    color: theme.colors.green,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  webMuted: {
    ...typography('caption'),
    color: theme.colors.grey,
    marginTop: theme.spacing.sm,
  },
});
