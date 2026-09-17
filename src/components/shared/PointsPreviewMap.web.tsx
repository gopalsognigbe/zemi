import { StyleSheet, Text, View } from 'react-native';

import { theme, typography } from '@/constants/theme';

import { type PointsPreviewMapProps } from './mapShared';

export type { PointsPreviewMapProps } from './mapShared';

export function PointsPreviewMap({ points, height = 160 }: PointsPreviewMapProps) {
  if (points.length === 0) return null;

  return (
    <View style={[styles.wrapper, { minHeight: height }]}>
      <Text style={styles.title}>Aperçu des points</Text>
      {points.map((point, index) => (
        <Text key={`${index}-${point.lat}`} style={styles.line}>
          {point.label ?? `Point ${index + 1}`} : {point.lat.toFixed(4)},{' '}
          {point.lng.toFixed(4)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.line,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.amberSoft,
    padding: theme.spacing.md,
  },
  title: {
    ...typography('caption'),
    color: theme.colors.greenDark,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  line: {
    ...typography('caption'),
    color: theme.colors.ink,
    marginTop: 2,
  },
});
