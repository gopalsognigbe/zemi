import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Clock, Home, User, Wallet } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ClientLayout() {
  const theme = useTheme();
  const { profile, loading, session } = useAuth();

  // Spinner seulement au tout premier chargement (évite de démonter le suivi de course)
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

  // Un zem ne doit jamais rester dans l’espace client
  if (profile?.role === 'driver') {
    return <Redirect href="/(driver)/home" />;
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
        name="activity"
        options={{
          title: 'Activité',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Clock color={color} size={size} strokeWidth={theme.icon.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Compte',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Wallet color={color} size={size} strokeWidth={theme.icon.strokeWidth} />
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
        name="rides"
        options={{
          title: 'Mes courses',
          href: null,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Mes livraisons',
          href: null,
        }}
      />
      <Tabs.Screen
        name="new-ride"
        options={{
          title: 'Commander une course',
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="new-delivery"
        options={{
          title: 'Envoyer un colis',
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="ride-status"
        options={{
          title: 'Suivi de course',
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="delivery-status"
        options={{
          title: 'Suivi de livraison',
          href: null,
          headerShown: false,
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
