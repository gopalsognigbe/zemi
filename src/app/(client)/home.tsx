import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Bell, Navigation, Package, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NearbyDriversMap } from '@/components/client/NearbyDriversMap';
import { ActionCard } from '@/components/ui/ActionCard';
import { Amount } from '@/components/ui/Amount';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { supabase } from '@/lib/supabase';

function greetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour,';
  if (hour < 18) return 'Bon après-midi,';
  return 'Bonsoir,';
}

function initialsFromName(fullName?: string): string {
  if (!fullName?.trim()) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last =
    parts.length > 1
      ? (parts[parts.length - 1]?.[0] ?? '')
      : (parts[0]?.[1] ?? '');
  return `${first}${last}`.toUpperCase();
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
        height: theme.layout.skeletonHeight,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.border,
      }}
    />
  );
}

export default function ClientHomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { count: unreadCount } = useUnreadCount();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const loadBalance = useCallback(async () => {
    if (!profile?.id) {
      setBalance(null);
      setBalanceLoading(false);
      return;
    }

    setBalanceLoading(true);
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (error || !data) {
      setBalance(0);
    } else {
      setBalance(Number(data.balance) || 0);
    }
    setBalanceLoading(false);
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadBalance();
    }, [loadBalance]),
  );

  const displayName = profile?.fullName?.trim() || 'Client';
  const greeting = greetingPrefix();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {/* a) En-tête vert */}
      <View
        style={{
          backgroundColor: theme.colors.green700,
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: theme.spacing.xxl + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderBottomLeftRadius: theme.radius.xxl,
          borderBottomRightRadius: theme.radius.xxl,
        }}>
        <View style={styles.headerRow}>
          <View
            style={{
              width: theme.layout.homeAvatar,
              height: theme.layout.homeAvatar,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.green500,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.md,
            }}>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.typography.label.fontSize,
                color: theme.colors.white,
              }}>
              {initialsFromName(profile?.fullName)}
            </Text>
          </View>

          <View style={styles.headerText}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                fontSize: theme.typography.caption.fontSize,
                lineHeight: theme.typography.caption.lineHeight,
                color: theme.colors.white,
                opacity: theme.layout.homeGreetingSubOpacity,
              }}>
              {greeting}
            </Text>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.homeGreeting,
                lineHeight: theme.layout.homeGreeting + theme.spacing.sm,
                color: theme.colors.white,
              }}
              numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            style={({ pressed }) => ({
              width: theme.layout.touchMin,
              height: theme.layout.touchMin,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}>
            <Bell
              size={theme.icon.size}
              strokeWidth={theme.icon.strokeWidth}
              color={theme.colors.white}
            />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: theme.spacing.sm,
                  right: theme.spacing.sm,
                  width: theme.spacing.sm + 2,
                  height: theme.spacing.sm + 2,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.amber500,
                  borderWidth: 1.5,
                  borderColor: theme.colors.green700,
                }}
              />
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* b) Carte portefeuille ambre */}
      <View
        style={{
          marginHorizontal: theme.spacing.lg,
          marginTop: -theme.spacing.xl,
          backgroundColor: theme.colors.amber500,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...theme.shadow.soft,
        }}>
        <View style={{ flex: 1, marginRight: theme.spacing.md }}>
          <Text
            style={{
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.layout.tabLabel,
              lineHeight: theme.layout.tabLabel + theme.spacing.xs,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: theme.colors.green900,
              opacity: theme.layout.splashTaglineOpacity,
              marginBottom: theme.spacing.sm,
            }}>
            Portefeuille
          </Text>
          {balanceLoading ? (
            <BalanceSkeleton />
          ) : (
            <Amount
              value={balance ?? 0}
              size="xl"
              tone="onAmber"
              stacked
            />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(client)/wallet')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.white,
            borderRadius: theme.radius.pill,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            minHeight: theme.layout.touchMin,
            opacity: pressed ? 0.9 : 1,
            ...theme.shadow.soft,
          })}>
          <Plus
            size={theme.icon.size - 4}
            strokeWidth={theme.icon.strokeWidth}
            color={theme.colors.green900}
          />
          <Text
            style={{
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: theme.typography.caption.fontSize,
              color: theme.colors.green900,
              marginLeft: theme.spacing.xs,
            }}>
            Recharger
          </Text>
        </Pressable>
      </View>

      {/* c) Carte des zems */}
      <View
        style={{
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
        }}>
        <NearbyDriversMap />
      </View>

      {/* d) Actions côte à côte */}
      <View
        style={{
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          flexDirection: 'row',
          gap: theme.spacing.md,
        }}>
        <ActionCard
          variant="filled"
          title="Commander une course"
          subtitle="Passager · dès maintenant"
          icon={Navigation}
          onPress={() => router.push('/(client)/new-ride')}
        />
        <ActionCard
          variant="outlined"
          title="Envoyer un colis"
          subtitle="Livraison · vendeurs"
          icon={Package}
          onPress={() => router.push('/(client)/new-delivery')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
});
