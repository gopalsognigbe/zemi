import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Amount } from '@/components/ui/Amount';
import { useTheme } from '@/constants/theme';

export interface TripSummaryRowProps {
  label: string;
  value: string;
  price?: number;
  icon?: ReactNode;
}

/**
 * Ligne résumé trajet / livraison + prix.
 */
export function TripSummaryRow({
  label,
  value,
  price,
  icon,
}: TripSummaryRowProps) {
  const theme = useTheme();

  return (
    <View>
      <Text
        style={{
          fontFamily: theme.fonts.jakartaMedium,
          fontSize: theme.layout.tabLabel,
          lineHeight: theme.layout.tabLabel + theme.spacing.xs,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.sm,
        }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        {icon ? (
          <View style={{ marginRight: theme.spacing.sm }}>{icon}</View>
        ) : null}
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
            color: theme.colors.textPrimary,
            marginRight: theme.spacing.md,
          }}>
          {value}
        </Text>
        {price != null ? <Amount value={price} size="md" /> : null}
      </View>
    </View>
  );
}
