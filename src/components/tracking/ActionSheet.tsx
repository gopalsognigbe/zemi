import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/constants/theme';

export interface ActionSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  reasons: readonly string[] | string[];
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: (reason: string, details: string) => void;
  onClose: () => void;
}

/**
 * Modal de choix de motif (annulation / signalement).
 */
export function ActionSheet({
  visible,
  title,
  description,
  reasons,
  confirmLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ActionSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setDetails('');
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}>
        <View
          style={{
            maxHeight: '85%',
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.layout.panelTopRadius,
            borderTopRightRadius: theme.layout.panelTopRadius,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
            ...theme.shadow.soft,
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: theme.layout.panelTitle,
              lineHeight: theme.layout.panelTitle + theme.spacing.sm,
              color: theme.colors.textPrimary,
            }}>
            {title}
          </Text>
          {description ? (
            <Text
              style={{
                marginTop: theme.spacing.sm,
                fontFamily: theme.fonts.jakartaRegular,
                fontSize: theme.typography.body.fontSize,
                lineHeight: theme.typography.body.lineHeight,
                color: theme.colors.textSecondary,
              }}>
              {description}
            </Text>
          ) : null}

          <ScrollView
            style={{ marginTop: theme.spacing.md, maxHeight: 280 }}
            keyboardShouldPersistTaps="handled">
            {reasons.map((reason) => {
              const active = selected === reason;
              return (
                <Pressable
                  key={reason}
                  accessibilityRole="button"
                  onPress={() => setSelected(reason)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: theme.layout.touchMin,
                    paddingVertical: theme.spacing.sm,
                    opacity: pressed ? 0.8 : 1,
                  })}>
                  <View
                    style={{
                      width: theme.spacing.lg + 4,
                      height: theme.spacing.lg + 4,
                      borderRadius: theme.radius.pill,
                      borderWidth: 2,
                      borderColor: active
                        ? theme.colors.green700
                        : theme.colors.border,
                      backgroundColor: active
                        ? theme.colors.green700
                        : 'transparent',
                      marginRight: theme.spacing.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {active ? (
                      <View
                        style={{
                          width: theme.spacing.sm,
                          height: theme.spacing.sm,
                          borderRadius: theme.radius.pill,
                          backgroundColor: theme.colors.white,
                        }}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: theme.fonts.jakartaMedium,
                      fontSize: theme.typography.body.fontSize,
                      color: theme.colors.textPrimary,
                    }}>
                    {reason}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ marginTop: theme.spacing.md }}>
            <Input
              label="Précisions (facultatif)"
              value={details}
              onChangeText={setDetails}
              placeholder="Décrivez brièvement…"
              multiline
            />
          </View>

          {destructive ? (
            <Pressable
              accessibilityRole="button"
              disabled={!selected || loading}
              onPress={() => {
                if (!selected) return;
                onConfirm(selected, details.trim());
              }}
              style={({ pressed }) => ({
                minHeight: theme.layout.confirmButtonHeight,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.brick,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !selected || loading ? 0.45 : pressed ? 0.9 : 1,
              })}>
              <Text
                style={{
                  fontFamily: theme.fonts.poppinsSemiBold,
                  fontSize: theme.typography.button.fontSize,
                  color: theme.colors.white,
                }}>
                {loading ? 'Patientez…' : confirmLabel}
              </Text>
            </Pressable>
          ) : (
            <Button
              label={confirmLabel}
              variant="primary"
              loading={loading}
              disabled={!selected}
              onPress={() => {
                if (!selected) return;
                onConfirm(selected, details.trim());
              }}
            />
          )}

          <View style={{ marginTop: theme.spacing.sm }}>
            <Button label="Retour" variant="ghost" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
