import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';

export interface LocationRowProps {
  icon: ReactNode;
  iconColor: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
}

/**
 * Ligne de saisie d'un lieu (départ / destination).
 */
export function LocationRow({
  icon,
  placeholder,
  value,
  onPress,
}: LocationRowProps) {
  const theme = useTheme();
  const hasValue = Boolean(value?.trim());

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: theme.layout.locationRowHeight,
        height: theme.layout.locationRowHeight,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}>
      <View style={{ marginRight: theme.spacing.md }}>{icon}</View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: hasValue
            ? theme.fonts.jakartaMedium
            : theme.fonts.jakartaRegular,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
          color: hasValue
            ? theme.colors.textPrimary
            : theme.colors.textSecondary,
        }}>
        {hasValue ? value : placeholder}
      </Text>
      <ChevronRight
        size={theme.icon.size}
        strokeWidth={theme.icon.strokeWidth}
        color={theme.colors.textSecondary}
      />
    </Pressable>
  );
}
