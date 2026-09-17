import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ZemiTrajectoryMark } from '@/components/brand/ZemiTrajectoryMark';
import { ZemiLogo } from '@/components/ui/ZemiLogo';
import { useTheme, type Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

function SplashChrome({
  theme,
  children,
  footer,
}: {
  theme: Theme;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[theme.colors.green700, theme.colors.green900]}
      style={styles.gradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}>
      <StatusBar style="light" />
      <View
        style={[
          styles.center,
          {
            paddingTop: insets.top + theme.spacing.xxl,
            paddingBottom: insets.bottom + theme.spacing.xl,
            paddingHorizontal: theme.spacing.xl,
          },
        ]}>
        <View style={styles.hero}>{children}</View>
        {footer}
      </View>
    </LinearGradient>
  );
}

export default function IndexScreen() {
  const { session, profile, loading } = useAuth();
  const theme = useTheme();

  // Attendre la session ET le profil avant de rediriger (évite d’envoyer un zem en mode client)
  if (loading || (session && !profile)) {
    return (
      <SplashChrome
        theme={theme}
        footer={
          <Text
            style={{
              color: theme.colors.white,
              opacity: theme.layout.splashFooterOpacity,
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.layout.tabLabel,
              lineHeight: theme.layout.tabLabel + theme.spacing.xs,
              letterSpacing: 3,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}>
            COTONOU · BÉNIN
          </Text>
        }>
        <ZemiTrajectoryMark />
        <View style={{ height: theme.spacing.xl }} />
        <ZemiLogo
          size={theme.layout.splashTitle}
          variant="onDark"
          showTagline={false}
        />
        <Text
          style={{
            color: theme.colors.white,
            opacity: theme.layout.splashTaglineOpacity,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
            marginTop: theme.spacing.md,
            textAlign: 'center',
          }}>
          Le zem, à portée de main
        </Text>
        <Text
          style={{
            color: theme.colors.white,
            opacity: theme.layout.splashTaglineOpacity,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.typography.caption.fontSize,
            lineHeight: theme.typography.caption.lineHeight,
            marginTop: theme.spacing.lg,
            textAlign: 'center',
          }}>
          Chargement de votre compte…
        </Text>
      </SplashChrome>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profile) {
    return (
      <SplashChrome theme={theme}>
        <ZemiTrajectoryMark />
        <View style={{ height: theme.spacing.xl }} />
        <ZemiLogo
          size={theme.layout.splashTitle}
          variant="onDark"
          showTagline={false}
        />
        <Text
          style={{
            color: theme.colors.amber300,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
            marginTop: theme.spacing.lg,
            textAlign: 'center',
          }}>
          Profil introuvable. Déconnectez-vous et recréez un compte, ou contactez
          le support.
        </Text>
      </SplashChrome>
    );
  }

  if (profile.role === 'driver') {
    return <Redirect href="/(driver)/home" />;
  }

  return <Redirect href="/(client)/home" />;
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
