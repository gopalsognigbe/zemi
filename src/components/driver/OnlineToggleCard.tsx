import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { Power } from 'lucide-react-native';

import { useTheme } from '@/constants/theme';

export interface OnlineToggleCardProps {
  isOnline: boolean;
  onToggle: () => void;
  loading?: boolean;
}

/**
 * Carte EN LIGNE / HORS LIGNE — action principale outdoor.
 */
export function OnlineToggleCard({
  isOnline,
  onToggle,
  loading = false,
}: OnlineToggleCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isOnline, disabled: loading }}
      disabled={loading}
      onPress={onToggle}
      style={({ pressed }) => ({
        minHeight: theme.layout.driverToggleHeight,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isOnline
          ? theme.colors.amber500
          : theme.colors.surface,
        borderWidth: isOnline ? 0 : 2,
        borderColor: theme.colors.border,
        opacity: loading ? 0.75 : pressed ? 0.92 : 1,
        ...theme.shadow.soft,
      })}>
      <View
        style={{
          width: theme.layout.driverToggleIcon + theme.spacing.lg,
          height: theme.layout.driverToggleIcon + theme.spacing.lg,
          borderRadius: theme.radius.pill,
          backgroundColor: isOnline
            ? theme.colors.white
            : theme.colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}>
        {loading ? (
          <ActivityIndicator
            color={
              isOnline ? theme.colors.green900 : theme.colors.textSecondary
            }
          />
        ) : (
          <Power
            size={theme.layout.driverToggleIcon}
            color={
              isOnline ? theme.colors.green900 : theme.colors.textSecondary
            }
            strokeWidth={theme.icon.strokeWidth}
          />
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: theme.fonts.poppinsBold,
            fontSize: theme.layout.driverToggleTitle,
            lineHeight: theme.layout.driverToggleTitle + theme.spacing.sm,
            color: isOnline
              ? theme.colors.green900
              : theme.colors.textPrimary,
            textTransform: 'uppercase',
          }}>
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </Text>
        <Text
          style={{
            marginTop: theme.spacing.xs,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.layout.homeCaption,
            color: isOnline
              ? theme.colors.green900
              : theme.colors.textSecondary,
            opacity: isOnline ? theme.layout.splashTaglineOpacity : 1,
          }}>
          {isOnline
            ? 'Vous recevez des courses'
            : 'Activez pour recevoir des courses'}
        </Text>
      </View>

      <Switch
        value={isOnline}
        disabled={loading}
        onValueChange={() => {
          if (!loading) onToggle();
        }}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.green700,
        }}
        thumbColor={theme.colors.white}
        ios_backgroundColor={theme.colors.border}
        style={{ transform: [{ scaleX: 1.15 }, { scaleY: 1.15 }] }}
      />
    </Pressable>
  );
}
