import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Home, Star, User, Wallet } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function DriverLayout() {
  const theme = useTheme();
  const { profile, loading, session } = useAuth();

  // Spinner seulement au tout premier chargement
  if (loading && !profile) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.green700} />
      </View>
    );
  }

  if (session && !profile && !loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.green700} />
      </View>
    );
  }

  // Un client ne doit pas accéder à l’espace zem
  if (profile && profile.role !== 'driver') {
    return <Redirect href="/(client)/home" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.green700,
        headerTitleStyle: {
          fontFamily: theme.fonts.poppinsSemiBold,
        },
        tabBarActiveTintColor: theme.colors.green700,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.jakartaMedium,
          fontSize: theme.layout.tabLabel,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          minHeight: theme.layout.touchMin + theme.spacing.lg,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm,
        },
        tabBarItemStyle: {
          minHeight: theme.layout.touchMin,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={theme.icon.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Gains',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Wallet color={color} size={size} strokeWidth={theme.icon.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="ratings"
        options={{
          title: 'Notes',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Star color={color} size={size} strokeWidth={theme.icon.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} strokeWidth={theme.icon.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messagerie',
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
