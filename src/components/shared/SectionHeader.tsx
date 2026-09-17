import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Titre de section avec action optionnelle.
 */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
        minHeight: theme.layout.touchMin / 1.5,
      }}>
      <Text
        style={{
          flex: 1,
          fontFamily: theme.fonts.poppinsSemiBold,
          fontSize: theme.layout.sectionTitle,
          lineHeight: theme.layout.sectionTitle + theme.spacing.sm,
          color: theme.colors.textPrimary,
        }}>
        {title}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: theme.layout.touchMin,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Text
            style={{
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.layout.homeCaption,
              color: theme.colors.green700,
              marginRight: theme.spacing.xs / 2,
            }}>
            {actionLabel}
          </Text>
          <ChevronRight
            size={theme.layout.homeCaption + 4}
            strokeWidth={theme.icon.strokeWidth}
            color={theme.colors.green700}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
