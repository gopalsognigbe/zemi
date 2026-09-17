import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'amber'
  | 'amberSolid';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const resolved =
    variant === 'amber'
      ? 'warning'
      : variant === 'amberSolid'
        ? 'amberSolid'
        : variant;

  return (
    <View style={[styles.base, styles[resolved]]}>
      <Text style={[styles.text, styles[`text_${resolved}` as const]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    minHeight: 24,
    justifyContent: 'center',
  } satisfies ViewStyle,
  success: {
    backgroundColor: theme.colors.green100,
  },
  warning: {
    backgroundColor: theme.colors.amber100,
  },
  amberSolid: {
    backgroundColor: theme.colors.amber500,
  },
  danger: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.brick,
  },
  neutral: {
    backgroundColor: theme.colors.border,
  },
  text: {
    fontFamily: theme.fonts.poppinsSemiBold,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  text_success: {
    color: theme.colors.green700,
  },
  text_warning: {
    color: theme.colors.amber900,
  },
  text_amberSolid: {
    color: theme.colors.green900,
  },
  text_danger: {
    color: theme.colors.brick,
  },
  text_neutral: {
    color: theme.colors.textSecondary,
  },
});
