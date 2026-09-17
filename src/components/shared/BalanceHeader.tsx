import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Amount } from '@/components/ui/Amount';
import { useTheme } from '@/constants/theme';

export interface BalanceHeaderProps {
  title: string;
  label: string;
  balance: number;
  loading?: boolean;
  actionLabel: string;
  actionIcon: LucideIcon;
  onAction: () => void;
  actionLoading?: boolean;
}

function BalanceSkeleton() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
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
        width: '55%',
        height: theme.layout.balanceAmount,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.green500,
        alignSelf: 'center',
        marginVertical: theme.spacing.sm,
      }}
    />
  );
}

/**
 * En-tête de solde (portefeuille client / gains zem).
 */
export function BalanceHeader({
  title,
  label,
  balance,
  loading = false,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  actionLoading = false,
}: BalanceHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: theme.colors.green700,
        paddingTop: insets.top + theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        borderBottomLeftRadius: theme.radius.xxl,
        borderBottomRightRadius: theme.radius.xxl,
      }}>
      <Text
        style={{
          fontFamily: theme.fonts.poppinsSemiBold,
          fontSize: theme.typography.subtitle.fontSize,
          lineHeight: theme.typography.subtitle.lineHeight,
          color: theme.colors.white,
          textAlign: 'center',
          marginBottom: theme.spacing.lg,
        }}>
        {title}
      </Text>

      <Text
        style={{
          fontFamily: theme.fonts.jakartaMedium,
          fontSize: theme.layout.balanceLabelSize,
          lineHeight: theme.layout.balanceLabelSize + theme.spacing.xs,
          letterSpacing: theme.layout.balanceLabelLetterSpacing,
          textTransform: 'uppercase',
          color: theme.colors.white,
          opacity: theme.layout.splashTaglineOpacity,
          textAlign: 'center',
          marginBottom: theme.spacing.xs,
        }}>
        {label}
      </Text>

      <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
        {loading ? (
          <BalanceSkeleton />
        ) : (
          <Amount value={balance} size="balance" tone="inverse" />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={actionLoading}
        onPress={onAction}
        style={({ pressed }) => ({
          minHeight: theme.layout.balanceActionHeight,
          height: theme.layout.balanceActionHeight,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.amber500,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: actionLoading ? 0.6 : pressed ? 0.9 : 1,
        })}>
        {actionLoading ? (
          <ActivityIndicator color={theme.colors.green900} />
        ) : (
          <>
            <ActionIcon
              size={theme.icon.size}
              strokeWidth={theme.icon.strokeWidth}
              color={theme.colors.green900}
              style={{ marginRight: theme.spacing.sm }}
            />
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.typography.button.fontSize,
                color: theme.colors.green900,
              }}>
              {actionLabel}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
