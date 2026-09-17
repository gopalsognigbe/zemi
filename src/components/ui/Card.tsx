import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, padded && styles.padded, style]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  } satisfies ViewStyle,
  padded: {
    padding: theme.spacing.lg,
  },
});
