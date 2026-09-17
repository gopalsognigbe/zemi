import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';

export type StatusPillVariant = 'searching' | 'active' | 'done' | 'cancelled';

export interface StatusPillProps {
  label: string;
  variant: StatusPillVariant;
}

/**
 * Pastille flottante de statut au-dessus de la carte de suivi.
 */
export function StatusPill({ label, variant }: StatusPillProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (variant !== 'searching') {
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [variant, pulse]);

  const bg =
    variant === 'searching'
      ? theme.colors.surface
      : variant === 'active'
        ? theme.colors.green700
        : variant === 'cancelled'
          ? theme.colors.brick
          : theme.colors.green500;

  const textColor =
    variant === 'searching' ? theme.colors.textPrimary : theme.colors.white;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + theme.spacing.sm,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 20,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: theme.layout.statusPillHeight,
          height: theme.layout.statusPillHeight,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.pill,
          backgroundColor: bg,
          maxWidth: '82%',
          ...theme.shadow.soft,
        }}>
        {variant === 'searching' ? (
          <Animated.View
            style={{
              width: theme.spacing.sm,
              height: theme.spacing.sm,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.green500,
              marginRight: theme.spacing.sm,
              opacity: pulse,
            }}
          />
        ) : null}
        {variant === 'active' ? (
          <View
            style={{
              width: theme.spacing.sm,
              height: theme.spacing.sm,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.amber500,
              marginRight: theme.spacing.sm,
            }}
          />
        ) : null}
        {variant === 'done' || variant === 'cancelled' ? (
          <ShieldCheck
            size={theme.layout.homeCaption + 2}
            color={theme.colors.white}
            strokeWidth={theme.icon.strokeWidth}
            style={{ marginRight: theme.spacing.sm }}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts.jakartaSemiBold,
            fontSize: theme.layout.homeCaption,
            lineHeight: theme.layout.homeCaption + theme.spacing.xs,
            color: textColor,
            flexShrink: 1,
          }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
