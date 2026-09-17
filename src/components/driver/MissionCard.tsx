import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { MapPin } from 'lucide-react-native';

import { Amount } from '@/components/ui/Amount';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/constants/theme';

export interface MissionCardProps {
  kind: 'ride' | 'delivery';
  payout: number;
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
  etaMin: number;
  expressBadge?: boolean;
  onAccept: () => void;
  accepting?: boolean;
  disabled?: boolean;
}

/**
 * Carte d'une mission disponible (course ou colis).
 */
export function MissionCard({
  kind,
  payout,
  fromLabel,
  toLabel,
  distanceKm,
  etaMin,
  expressBadge = false,
  onAccept,
  accepting = false,
  disabled = false,
}: MissionCardProps) {
  const theme = useTheme();
  const distanceLabel = distanceKm.toFixed(1).replace('.', ',');

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        ...theme.shadow.soft,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
            alignItems: 'center',
          }}>
          <Badge
            label={kind === 'ride' ? 'Course' : 'Colis'}
            variant={kind === 'ride' ? 'success' : 'amber'}
          />
          {expressBadge ? (
            <Badge label="Express" variant="amberSolid" />
          ) : null}
        </View>
        <Amount
          value={payout}
          size="mission"
          tone="green"
          currencySuffix="F"
        />
      </View>

      <View style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: theme.spacing.md,
              height: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.green500,
              marginRight: theme.spacing.md,
            }}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textPrimary,
            }}>
            {fromLabel}
          </Text>
        </View>

        <View
          style={{
            width: 2,
            height: theme.spacing.lg,
            borderStyle: 'dashed',
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginLeft: theme.spacing.sm - 1,
            marginVertical: theme.spacing.xs,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MapPin
            size={theme.icon.size}
            color={theme.colors.brick}
            strokeWidth={theme.icon.strokeWidth}
            style={{ marginRight: theme.spacing.sm }}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textPrimary,
            }}>
            {toLabel}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: theme.fonts.jakartaRegular,
          fontSize: theme.layout.homeCaption,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.md,
        }}>
        {distanceLabel} km · à {etaMin} min de vous
      </Text>

      <Pressable
        accessibilityRole="button"
        disabled={accepting || disabled}
        onPress={onAccept}
        style={({ pressed }) => ({
          minHeight: theme.layout.driverAcceptHeight,
          height: theme.layout.driverAcceptHeight,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.amber500,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: accepting || disabled ? 0.5 : pressed ? 0.9 : 1,
        })}>
        {accepting ? (
          <ActivityIndicator color={theme.colors.green900} />
        ) : (
          <Text
            style={{
              fontFamily: theme.fonts.poppinsBold,
              fontSize: theme.layout.driverAcceptLabel,
              color: theme.colors.green900,
              textTransform: 'uppercase',
            }}>
            Accepter
          </Text>
        )}
      </Pressable>
    </View>
  );
}
