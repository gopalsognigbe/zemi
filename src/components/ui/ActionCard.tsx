import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';

export type ActionCardVariant = 'filled' | 'outlined';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  onPress: () => void;
  variant?: ActionCardVariant;
  /** @deprecated préférer icon Lucide */
  emoji?: string;
}

export function ActionCard({
  title,
  subtitle,
  icon: Icon,
  onPress,
  variant = 'outlined',
}: ActionCardProps) {
  const theme = useTheme();
  const filled = variant === 'filled';

  const bg = filled ? theme.colors.green700 : theme.colors.surface;
  const borderColor = filled ? theme.colors.green700 : theme.colors.border;
  const titleColor = filled ? theme.colors.white : theme.colors.textPrimary;
  const subtitleColor = filled
    ? theme.colors.white
    : theme.colors.textSecondary;
  const iconColor = filled ? theme.colors.white : theme.colors.amber500;

  return (
    <Pressable
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.md,
          minHeight: theme.layout.homeActionHeight,
          height: theme.layout.homeActionHeight,
          justifyContent: 'space-between',
          ...theme.shadow.soft,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
      onPress={onPress}
      accessibilityRole="button">
      <Icon
        size={theme.layout.homeActionIcon}
        strokeWidth={theme.icon.strokeWidth}
        color={iconColor}
      />
      <View>
        <Text
          style={{
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.layout.homeActionTitle,
            lineHeight: theme.layout.homeActionTitle + theme.spacing.sm,
            color: titleColor,
            marginBottom: theme.spacing.xs,
          }}>
          {title}
        </Text>
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.layout.homeActionSubtitle,
            lineHeight:
              theme.layout.homeActionSubtitle + theme.spacing.xs,
            color: subtitleColor,
            opacity: filled ? theme.layout.splashTaglineOpacity : 1,
          }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
