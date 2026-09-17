import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';

import { Amount } from '@/components/ui/Amount';
import { useTheme } from '@/constants/theme';

export interface FareBoxProps {
  price?: number;
  durationMin?: number;
  distanceKm?: number;
  loading?: boolean;
  label?: string;
}

function formatDistanceFr(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function SkeletonBar({ width }: { width: `${number}%` | number }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        width,
        height: theme.layout.skeletonHeight,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.border,
      }}
    />
  );
}

/**
 * Encadré prix estimé (ambre) avec durée / distance.
 */
export function FareBox({
  price,
  durationMin,
  distanceKm,
  loading = false,
  label = 'PRIX ESTIMÉ',
}: FareBoxProps) {
  const theme = useTheme();

  const parts: string[] = [];
  if (durationMin != null) {
    parts.push(`${Math.round(durationMin)} min`);
  }
  if (distanceKm != null) {
    parts.push(formatDistanceFr(distanceKm));
  }
  const meta = parts.length > 0 ? parts.join(' · ') : null;

  return (
    <View
      style={{
        backgroundColor: theme.colors.amber100,
        borderWidth: 1,
        borderColor: theme.colors.amber300,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
        <View style={{ flex: 1, marginRight: theme.spacing.md }}>
          <Text
            style={{
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.layout.tabLabel,
              lineHeight: theme.layout.tabLabel + theme.spacing.xs,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: theme.colors.amber900,
              marginBottom: theme.spacing.sm,
            }}>
            {label}
          </Text>
          {loading || price == null ? (
            <SkeletonBar width="55%" />
          ) : (
            <Amount value={price} size="lg" tone="onAmber" />
          )}
        </View>

        {loading ? (
          <SkeletonBar width={88} />
        ) : meta ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.white,
              borderRadius: theme.radius.pill,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              maxWidth: '48%',
            }}>
            <Clock
              size={theme.layout.homeActionSubtitle + 2}
              strokeWidth={theme.icon.strokeWidth}
              color={theme.colors.green700}
            />
            <Text
              style={{
                marginLeft: theme.spacing.xs,
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.layout.homeCaption,
                lineHeight: theme.layout.homeCaption + theme.spacing.xs,
                color: theme.colors.green900,
                flexShrink: 1,
              }}
              numberOfLines={2}>
              {meta}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
