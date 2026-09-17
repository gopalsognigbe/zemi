import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/constants/theme';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * État vide centré (listes / historiques).
 */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.lg,
      }}>
      <View
        style={{
          width: theme.layout.emptyIconCircle,
          height: theme.layout.emptyIconCircle,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.green100,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.lg,
        }}>
        <Icon
          size={theme.layout.emptyIcon}
          strokeWidth={theme.icon.strokeWidth}
          color={theme.colors.green700}
        />
      </View>

      <Text
        style={{
          fontFamily: theme.fonts.poppinsSemiBold,
          fontSize: theme.layout.emptyTitle,
          lineHeight: theme.layout.emptyTitle + theme.spacing.sm,
          color: theme.colors.textPrimary,
          textAlign: 'center',
          marginBottom: theme.spacing.sm,
        }}>
        {title}
      </Text>

      <Text
        style={{
          fontFamily: theme.fonts.jakartaRegular,
          fontSize: theme.layout.homeCaption,
          lineHeight: theme.typography.caption.lineHeight + 2,
          color: theme.colors.textSecondary,
          textAlign: 'center',
          marginBottom: actionLabel && onAction ? theme.spacing.lg : 0,
        }}>
        {subtitle}
      </Text>

      {actionLabel && onAction ? (
        <View style={{ width: '100%' }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
