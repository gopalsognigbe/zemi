import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { theme } from '@/constants/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  icon?: LucideIcon;
}

export function Input({
  label,
  error,
  icon: Icon,
  multiline,
  ...rest
}: InputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          multiline ? styles.fieldMultiline : null,
          error ? styles.fieldError : null,
        ]}>
        {Icon ? (
          <View style={[styles.icon, multiline ? styles.iconTop : null]}>
            <Icon
              size={theme.icon.size}
              strokeWidth={theme.icon.strokeWidth}
              color={theme.colors.textSecondary}
            />
          </View>
        ) : null}
        <TextInput
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          placeholderTextColor={theme.colors.textSecondary}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.fonts.jakartaMedium,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
  },
  fieldMultiline: {
    alignItems: 'flex-start',
    minHeight: 96,
    paddingVertical: theme.spacing.sm,
  },
  fieldError: {
    borderColor: theme.colors.brick,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  iconTop: {
    marginTop: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.jakartaRegular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: theme.spacing.sm,
  },
  error: {
    fontFamily: theme.fonts.jakartaRegular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.brick,
    marginTop: theme.spacing.xs,
  },
});
