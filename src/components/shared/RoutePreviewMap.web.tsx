import { StyleSheet, Text, View } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';
import type { LatLng } from '@/types';

import { COTONOU_CENTER } from './mapShared';

export interface RoutePreviewMapProps {
  pickup?: LatLng;
  destination?: LatLng;
  height?: number;
}

/**
 * Fallback web : aperçu textuel du trajet (pas de maps natives).
 */
export function RoutePreviewMap({
  pickup,
  destination,
  height = 280,
}: RoutePreviewMapProps) {
  const theme = useTheme();
  const focus = pickup ?? destination ?? COTONOU_CENTER;

  return (
    <View
      style={{
        height,
        backgroundColor: theme.colors.green100,
        padding: theme.spacing.lg,
        justifyContent: 'center',
      }}>
      <Text
        style={{
          fontFamily: theme.fonts.poppinsSemiBold,
          fontSize: theme.typography.subtitle.fontSize,
          color: theme.colors.green700,
          marginBottom: theme.spacing.md,
          textAlign: 'center',
        }}>
        Aperçu du trajet
      </Text>
      <View style={styles.row}>
        <Navigation
          size={theme.icon.size}
          color={theme.colors.green500}
          strokeWidth={theme.icon.strokeWidth}
        />
        <Text
          style={{
            marginLeft: theme.spacing.sm,
            fontFamily: theme.fonts.jakartaRegular,
            color: theme.colors.textPrimary,
            flex: 1,
          }}>
          {pickup
            ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`
            : 'Départ non défini'}
        </Text>
      </View>
      <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
        <MapPin
          size={theme.icon.size}
          color={theme.colors.brick}
          strokeWidth={theme.icon.strokeWidth}
        />
        <Text
          style={{
            marginLeft: theme.spacing.sm,
            fontFamily: theme.fonts.jakartaRegular,
            color: theme.colors.textPrimary,
            flex: 1,
          }}>
          {destination
            ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
            : 'Destination non définie'}
        </Text>
      </View>
      <Text
        style={{
          marginTop: theme.spacing.md,
          fontFamily: theme.fonts.jakartaRegular,
          fontSize: theme.typography.caption.fontSize,
          color: theme.colors.textSecondary,
          textAlign: 'center',
        }}>
        Centre : {focus.lat.toFixed(3)}, {focus.lng.toFixed(3)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
