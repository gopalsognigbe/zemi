import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { theme } from '@/constants/theme';

export type ButtonVariant =
  | 'primary'
  | 'amber'
  | 'secondary'
  | 'ghost'
  | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon: Icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const iconColor =
    variant === 'primary'
      ? theme.colors.white
      : variant === 'amber'
        ? theme.colors.green900
        : variant === 'danger'
          ? theme.colors.brick
          : theme.colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button">
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <View style={styles.content}>
          {Icon ? (
            <View style={styles.iconSlot}>
              <Icon
                size={theme.icon.size}
                strokeWidth={theme.icon.strokeWidth}
                color={iconColor}
              />
            </View>
          ) : null}
          <Text
            style={[
              styles.label,
              variant === 'primary' && styles.labelPrimary,
              variant === 'amber' && styles.labelAmber,
              variant === 'secondary' && styles.labelSecondary,
              variant === 'ghost' && styles.labelGhost,
              variant === 'danger' && styles.labelDanger,
            ]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    minHeight: 52,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  primary: {
    backgroundColor: theme.colors.green700,
  },
  amber: {
    backgroundColor: theme.colors.amber500,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.brick,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    marginRight: theme.spacing.sm,
  },
  label: {
    fontFamily: theme.fonts.poppinsSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  labelPrimary: {
    color: theme.colors.white,
  },
  labelAmber: {
    color: theme.colors.green900,
  },
  labelSecondary: {
    color: theme.colors.textPrimary,
  },
  labelGhost: {
    color: theme.colors.textPrimary,
  },
  labelDanger: {
    color: theme.colors.brick,
  },
});
