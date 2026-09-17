import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

interface ZemiLogoProps {
  size?: number;
  variant?: 'onLight' | 'onDark';
  /** Compat. anciens appels size="display" | "title" */
  legacySize?: 'display' | 'title';
  showTagline?: boolean;
}

function resolveFontSize(
  size: number | undefined,
  legacySize: 'display' | 'title' | undefined,
): number {
  if (typeof size === 'number') return size;
  if (legacySize === 'title') return 28;
  return 40;
}

/**
 * Mot-symbole ZEMi — Baloo2-Bold, point du « i » remplacé par un cercle ambre.
 */
export function ZemiLogo({
  size,
  variant = 'onLight',
  legacySize,
  showTagline = true,
}: ZemiLogoProps) {
  const fontSize = resolveFontSize(size, legacySize);
  const onDark = variant === 'onDark';
  const textColor = onDark ? theme.colors.white : theme.colors.green700;
  const taglineColor = onDark ? theme.colors.green100 : theme.colors.textSecondary;
  const dotSize = Math.max(6, Math.round(fontSize * 0.22));

  return (
    <View style={[styles.container, !showTagline && styles.containerTight]}>
      <View style={styles.wordmark}>
        <Text
          style={[
            styles.zem,
            {
              fontSize,
              lineHeight: Math.round(fontSize * 1.15),
              color: textColor,
            },
          ]}>
          ZEMı
        </Text>
        {/* Cercle ambre = point du « i » (lettre sans point + pastille) */}
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              right: fontSize * 0.08,
              top: fontSize * 0.08,
            },
          ]}
        />
      </View>
      {showTagline ? (
        <Text style={[styles.tagline, { color: taglineColor }]}>
          Le réseau des zems de Cotonou
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  containerTight: {
    marginBottom: 0,
  },
  wordmark: {
    position: 'relative',
  },
  zem: {
    fontFamily: theme.fonts.balooBold,
    letterSpacing: 0.5,
  },
  dot: {
    position: 'absolute',
    backgroundColor: theme.colors.amber500,
  },
  tagline: {
    fontFamily: theme.fonts.jakartaRegular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
