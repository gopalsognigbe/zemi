import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { MessageCircle, Phone, Star } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';

export interface DriverCardDriver {
  fullName: string;
  avatarUrl?: string | null;
  ratingAvg: number;
  ratingCount: number;
  vehicleLabel?: string | null;
}

export interface DriverCardProps {
  driver: DriverCardDriver | null;
  loading?: boolean;
  onMessage: () => void;
  onCall?: () => void;
  callDisabled?: boolean;
  unreadCount?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const a = parts[0]?.[0] ?? '';
  const b =
    parts.length > 1
      ? (parts[parts.length - 1]?.[0] ?? '')
      : (parts[0]?.[1] ?? '');
  return `${a}${b}`.toUpperCase();
}

function Skeleton({
  width,
  height,
}: {
  width: number | `${number}%`;
  height: number;
}) {
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
        height,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.border,
      }}
    />
  );
}

/**
 * Fiche conducteur : avatar, note, avis, message / appel.
 */
export function DriverCard({
  driver,
  loading = false,
  onMessage,
  onCall,
  callDisabled = false,
  unreadCount = 0,
}: DriverCardProps) {
  const theme = useTheme();

  if (loading || !driver) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}>
        <Skeleton
          width={theme.layout.driverAvatar}
          height={theme.layout.driverAvatar}
        />
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <Skeleton width="70%" height={theme.spacing.lg} />
          <Skeleton width="50%" height={theme.spacing.md} />
        </View>
        <Skeleton
          width={theme.layout.driverActionBtn}
          height={theme.layout.driverActionBtn}
        />
        <Skeleton
          width={theme.layout.driverActionBtn}
          height={theme.layout.driverActionBtn}
        />
      </View>
    );
  }

  const rating = Number(driver.ratingAvg)
    .toFixed(1)
    .replace('.', ',');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {driver.avatarUrl ? (
        <Image
          source={{ uri: driver.avatarUrl }}
          style={{
            width: theme.layout.driverAvatar,
            height: theme.layout.driverAvatar,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.green100,
          }}
        />
      ) : (
        <View
          style={{
            width: theme.layout.driverAvatar,
            height: theme.layout.driverAvatar,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.green100,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: theme.typography.label.fontSize,
              color: theme.colors.green700,
            }}>
            {initials(driver.fullName)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1, marginHorizontal: theme.spacing.md, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.layout.driverNameSize,
            lineHeight: theme.layout.driverNameSize + theme.spacing.sm,
            color: theme.colors.textPrimary,
          }}>
          {driver.fullName}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: theme.spacing.xs,
            flexWrap: 'wrap',
          }}>
          <Star
            size={theme.layout.homeCaption}
            color={theme.colors.amber500}
            fill={theme.colors.amber500}
            strokeWidth={theme.icon.strokeWidth}
          />
          <Text
            style={{
              marginLeft: theme.spacing.xs,
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.layout.homeCaption,
              color: theme.colors.textPrimary,
            }}>
            {rating}
          </Text>
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              fontSize: theme.layout.homeCaption,
              color: theme.colors.textSecondary,
            }}>
            {' '}
            · {driver.ratingCount} avis
          </Text>
        </View>
        {driver.vehicleLabel ? (
          <Text
            numberOfLines={1}
            style={{
              marginTop: theme.spacing.xs,
              fontFamily: theme.fonts.jakartaRegular,
              fontSize: theme.layout.homeActionSubtitle,
              color: theme.colors.textSecondary,
            }}>
            {driver.vehicleLabel}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Message"
        onPress={onMessage}
        style={({ pressed }) => ({
          width: theme.layout.driverActionBtn,
          height: theme.layout.driverActionBtn,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.green100,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
          opacity: pressed ? 0.85 : 1,
        })}>
        <MessageCircle
          size={theme.icon.size}
          color={theme.colors.green700}
          strokeWidth={theme.icon.strokeWidth}
        />
        {unreadCount > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: theme.spacing.lg,
              height: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.amber500,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: 10,
                color: theme.colors.green900,
              }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Appeler"
        disabled={callDisabled || !onCall}
        onPress={onCall}
        style={({ pressed }) => ({
          width: theme.layout.driverActionBtn,
          height: theme.layout.driverActionBtn,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.amber500,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: callDisabled || !onCall ? 0.4 : pressed ? 0.85 : 1,
        })}>
        <Phone
          size={theme.icon.size}
          color={theme.colors.green900}
          strokeWidth={theme.icon.strokeWidth}
        />
      </Pressable>
    </View>
  );
}
