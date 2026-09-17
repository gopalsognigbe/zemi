import { StyleSheet, Text, View } from 'react-native';

import { theme, typography } from '@/constants/theme';

interface PlaceholderScreenProps {
  title: string;
}

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Écran en construction</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.md,
  },
  title: {
    ...typography('title'),
    color: theme.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    ...typography('body'),
    color: theme.colors.grey,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
