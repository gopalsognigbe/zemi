import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Amount } from '@/components/ui/Amount';
import { useTheme } from '@/constants/theme';

export interface StatsRowProps {
  earnings: number;
  jobs: number;
  loading?: boolean;
  onPress?: () => void;
}

function Skeleton() {
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
        width: '60%',
        height: theme.layout.driverStatsValue,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.border,
        alignSelf: 'center',
      }}
    />
  );
}

/**
 * Gains et missions du jour (lien vers Mes gains).
 */
export function StatsRow({
  earnings,
  jobs,
  loading = false,
  onPress,
}: StatsRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={
        onPress ?? (() => router.push('/(driver)/earnings'))
      }
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        minHeight: theme.layout.driverTouchMain + theme.spacing.lg,
        opacity: pressed ? 0.92 : 1,
        ...theme.shadow.soft,
      })}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.sm,
        }}>
        {loading ? (
          <Skeleton />
        ) : (
          <Amount
            value={earnings}
            size="stats"
            tone="green"
            currencySuffix="F"
          />
        )}
        <Text
          style={{
            marginTop: theme.spacing.xs,
            fontFamily: theme.fonts.jakartaMedium,
            fontSize: theme.layout.chatContextSize,
            color: theme.colors.textSecondary,
          }}>
          Aujourd&apos;hui
        </Text>
      </View>

      <View
        style={{
          width: 1,
          backgroundColor: theme.colors.border,
          marginVertical: theme.spacing.md,
        }}
      />

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.sm,
        }}>
        {loading ? (
          <Skeleton />
        ) : (
          <Text
            style={{
              fontFamily: theme.fonts.poppinsBold,
              fontSize: theme.layout.driverStatsValue,
              lineHeight: theme.layout.driverStatsValue + theme.spacing.sm,
              color: theme.colors.green700,
            }}>
            {jobs}
          </Text>
        )}
        <Text
          style={{
            marginTop: theme.spacing.xs,
            fontFamily: theme.fonts.jakartaMedium,
            fontSize: theme.layout.chatContextSize,
            color: theme.colors.textSecondary,
          }}>
          Missions
        </Text>
      </View>
    </Pressable>
  );
}
