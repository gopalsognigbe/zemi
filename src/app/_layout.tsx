import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
} from '@expo-google-fonts/baloo-2';
import {
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { AuthProvider } from '@/context/AuthContext';
import { ThemePreferenceProvider } from '@/context/ThemePreferenceContext';
import { theme, useTheme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore si déjà géré
});

function ThemedStatusBar() {
  const current = useTheme();
  return <StatusBar style={current.mode === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Baloo2-Bold': Baloo2_700Bold,
    'Baloo2-SemiBold': Baloo2_600SemiBold,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.bg },
            headerTintColor: theme.colors.green700,
            contentStyle: { backgroundColor: theme.colors.bg },
            headerTitleStyle: {
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: 17,
              color: theme.colors.textPrimary,
            },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(client)" options={{ headerShown: false }} />
          <Stack.Screen name="(driver)" options={{ headerShown: false }} />
        </Stack>
        <ThemedStatusBar />
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}
