import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ChevronRight,
  Clock,
  Monitor,
  Moon,
  Sun,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  useThemePreference,
  type ThemePreference,
} from '@/context/ThemePreferenceContext';

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

const APPEARANCE_OPTIONS: {
  key: ThemePreference;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: 'system', label: 'Système', icon: Monitor },
  { key: 'light', label: 'Clair', icon: Sun },
  { key: 'dark', label: 'Sombre', icon: Moon },
];

export default function ClientProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0';

  async function handleSignOut() {
    setError(null);
    setLoading(true);
    const result = await signOut();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/(auth)/login');
  }

  function confirmSignOut() {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => void handleSignOut(),
        },
      ],
    );
  }

  const menuItems: {
    label: string;
    icon: LucideIcon;
    onPress: () => void;
  }[] = [
    {
      label: 'Mon compte',
      icon: Wallet,
      onPress: () => router.push('/(client)/wallet'),
    },
    {
      label: 'Mon activité',
      icon: Clock,
      onPress: () => router.push('/(client)/activity'),
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xxl }}>
      <View
        style={{
          backgroundColor: theme.colors.green700,
          paddingTop: insets.top + theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          borderBottomLeftRadius: theme.radius.xxl,
          borderBottomRightRadius: theme.radius.xxl,
          alignItems: 'center',
        }}>
        <View
          style={{
            width: theme.layout.profileAvatar,
            height: theme.layout.profileAvatar,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.green500,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: theme.spacing.md,
          }}>
          {profile?.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={{
                width: theme.layout.profileAvatar,
                height: theme.layout.profileAvatar,
              }}
            />
          ) : (
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.typography.title.fontSize,
                color: theme.colors.white,
              }}>
              {initialsFromName(profile?.fullName)}
            </Text>
          )}
        </View>

        <Text
          style={{
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.layout.homeGreeting,
            lineHeight: theme.layout.homeGreeting + theme.spacing.sm,
            color: theme.colors.white,
            textAlign: 'center',
          }}>
          {profile?.fullName?.trim() || 'Client'}
        </Text>
        <Text
          style={{
            marginTop: theme.spacing.xs,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.white,
            opacity: theme.layout.splashTaglineOpacity,
          }}>
          {profile?.phone ?? '—'}
        </Text>
        <View style={{ marginTop: theme.spacing.md }}>
          <Badge label="Client" variant="amberSolid" />
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xl,
        }}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
            marginBottom: theme.spacing.xl,
          }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={item.onPress}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: theme.layout.touchMin + theme.spacing.sm,
                  paddingHorizontal: theme.spacing.lg,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <View
                  style={{
                    width: theme.layout.txIconCircle,
                    height: theme.layout.txIconCircle,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.green100,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: theme.spacing.md,
                  }}>
                  <Icon
                    size={theme.icon.size}
                    color={theme.colors.green700}
                    strokeWidth={theme.icon.strokeWidth}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: theme.fonts.poppinsMedium,
                    fontSize: theme.typography.body.fontSize,
                    color: theme.colors.textPrimary,
                  }}>
                  {item.label}
                </Text>
                <ChevronRight
                  size={theme.icon.size}
                  color={theme.colors.textSecondary}
                  strokeWidth={theme.icon.strokeWidth}
                />
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => setAppearanceOpen((open) => !open)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: theme.layout.touchMin + theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              opacity: pressed ? 0.85 : 1,
            })}>
            <View
              style={{
                width: theme.layout.txIconCircle,
                height: theme.layout.txIconCircle,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.green100,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: theme.spacing.md,
              }}>
              <Monitor
                size={theme.icon.size}
                color={theme.colors.green700}
                strokeWidth={theme.icon.strokeWidth}
              />
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: theme.fonts.poppinsMedium,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.textPrimary,
              }}>
              Apparence
            </Text>
            <ChevronRight
              size={theme.icon.size}
              color={theme.colors.textSecondary}
              strokeWidth={theme.icon.strokeWidth}
              style={{
                transform: [{ rotate: appearanceOpen ? '90deg' : '0deg' }],
              }}
            />
          </Pressable>

          {appearanceOpen ? (
            <View
              style={{
                paddingHorizontal: theme.spacing.lg,
                paddingBottom: theme.spacing.lg,
                gap: theme.spacing.sm,
              }}>
              {APPEARANCE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = preference === option.key;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    onPress={() => setPreference(option.key)}
                    style={({ pressed }) => ({
                      minHeight: theme.layout.appearanceOptionHeight,
                      borderRadius: theme.radius.lg,
                      borderWidth: 1,
                      borderColor: active
                        ? theme.colors.green700
                        : theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.green100
                        : theme.colors.bg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: theme.spacing.md,
                      opacity: pressed ? 0.9 : 1,
                    })}>
                    <Icon
                      size={theme.icon.size}
                      color={
                        active
                          ? theme.colors.green700
                          : theme.colors.textSecondary
                      }
                      strokeWidth={theme.icon.strokeWidth}
                      style={{ marginRight: theme.spacing.sm }}
                    />
                    <Text
                      style={{
                        fontFamily: active
                          ? theme.fonts.poppinsSemiBold
                          : theme.fonts.jakartaMedium,
                        fontSize: theme.typography.body.fontSize,
                        color: active
                          ? theme.colors.green700
                          : theme.colors.textPrimary,
                      }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {error ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.brick,
              marginBottom: theme.spacing.md,
            }}>
            {error}
          </Text>
        ) : null}

        <Button
          label="Se déconnecter"
          variant="danger"
          loading={loading}
          onPress={confirmSignOut}
        />

        <Text
          style={{
            marginTop: theme.spacing.xl,
            textAlign: 'center',
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.layout.chatTimeSize,
            color: theme.colors.textSecondary,
          }}>
          ZEMi · Cotonou, Bénin
        </Text>
        <Text
          style={{
            marginTop: theme.spacing.xs,
            textAlign: 'center',
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.layout.chatTimeSize,
            color: theme.colors.textSecondary,
          }}>
          Version {appVersion}
        </Text>
      </View>
    </ScrollView>
  );
}
