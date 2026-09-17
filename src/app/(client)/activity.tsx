import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeliveriesList } from '@/components/client/DeliveriesList';
import { RidesList } from '@/components/client/RidesList';
import { useTheme } from '@/constants/theme';

type ActivityTab = 'rides' | 'deliveries';

export default function ClientActivityScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ActivityTab>('rides');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}>
        <Text
          style={{
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.layout.activityTitle,
            lineHeight: theme.layout.activityTitle + theme.spacing.sm,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing.md,
          }}>
          Mon activité
        </Text>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.green100,
            borderRadius: theme.radius.pill,
            padding: theme.spacing.xs,
          }}>
          {(
            [
              { key: 'rides', label: 'Courses' },
              { key: 'deliveries', label: 'Livraisons' },
            ] as const
          ).map((option) => {
            const active = tab === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={() => setTab(option.key)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: theme.layout.touchMin,
                  borderRadius: theme.radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active
                    ? theme.colors.surface
                    : 'transparent',
                  opacity: pressed && !active ? 0.8 : 1,
                  ...(active ? theme.shadow.soft : null),
                })}>
                <Text
                  style={{
                    fontFamily: theme.fonts.poppinsSemiBold,
                    fontSize: theme.typography.label.fontSize,
                    color: active
                      ? theme.colors.green700
                      : theme.colors.textSecondary,
                  }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.list}>
        {tab === 'rides' ? (
          <RidesList showTitle={false} />
        ) : (
          <DeliveriesList showTitle={false} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
