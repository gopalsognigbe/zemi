import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/constants/theme';

const CODE_LENGTH = 4;

export interface CodeEntryModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: (code: string) => void;
  onClose: () => void;
}

/**
 * Modal de saisie du code à 4 chiffres (démarrage course / fin livraison).
 * Usage extérieur : cases larges, clavier numérique, contraste élevé.
 */
export function CodeEntryModal({
  visible,
  title,
  subtitle,
  confirmLabel = 'Valider',
  loading = false,
  error = null,
  onSubmit,
  onClose,
}: CodeEntryModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const inputsRef = useRef<(TextInputType | null)[]>([]);

  useEffect(() => {
    if (!visible) {
      setDigits(['', '', '', '']);
      return;
    }
    const t = setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 250);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (error) {
      setDigits(['', '', '', '']);
      inputsRef.current[0]?.focus();
    }
  }, [error]);

  const code = digits.join('');
  const canSubmit = code.length === CODE_LENGTH && !loading;

  function setDigitAt(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned.length > 1) {
      // Collage éventuel de plusieurs chiffres
      const chars = cleaned.slice(0, CODE_LENGTH).split('');
      const next = ['', '', '', ''];
      chars.forEach((c, i) => {
        next[i] = c;
      });
      setDigits(next);
      const focusIndex = Math.min(chars.length, CODE_LENGTH - 1);
      inputsRef.current[focusIndex]?.focus();
      return;
    }

    const value = cleaned.slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    if (value && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!loading) onClose();
      }}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: theme.colors.black,
            opacity: theme.layout.overlayOpacity,
          }}
          onPress={() => {
            if (!loading) onClose();
          }}
        />

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.layout.panelTopRadius,
            borderTopRightRadius: theme.layout.panelTopRadius,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
            ...theme.shadow.soft,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}>
            <Text
              style={{
                flex: 1,
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.panelTitle,
                color: theme.colors.textPrimary,
              }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onClose}
              style={{
                width: theme.layout.touchMin,
                height: theme.layout.touchMin,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <X
                size={theme.icon.size}
                color={theme.colors.textSecondary}
                strokeWidth={theme.icon.strokeWidth}
              />
            </Pressable>
          </View>

          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.xl,
            }}>
            {subtitle}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: theme.layout.codeDigitGap,
              marginBottom: theme.spacing.lg,
            }}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputsRef.current[index] = ref;
                }}
                value={digit}
                onChangeText={(text) => setDigitAt(index, text)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                keyboardType="number-pad"
                maxLength={index === 0 ? CODE_LENGTH : 1}
                editable={!loading}
                selectTextOnFocus
                textContentType="oneTimeCode"
                accessibilityLabel={`Chiffre ${index + 1} du code`}
                style={{
                  width: theme.layout.codeDigitBox,
                  height: theme.layout.codeDigitBox,
                  borderRadius: theme.radius.lg,
                  borderWidth: 2,
                  borderColor: digit
                    ? theme.colors.green700
                    : theme.colors.border,
                  backgroundColor: theme.colors.bg,
                  textAlign: 'center',
                  fontFamily: theme.fonts.poppinsBold,
                  fontSize: theme.layout.codeDigitSize,
                  color: theme.colors.textPrimary,
                }}
              />
            ))}
          </View>

          {error ? (
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.brick,
                textAlign: 'center',
                marginBottom: theme.spacing.md,
              }}>
              {error}
            </Text>
          ) : null}

          <Button
            label={confirmLabel}
            variant="amber"
            loading={loading}
            disabled={!canSubmit}
            onPress={() => {
              const submitted = code;
              setDigits(['', '', '', '']);
              onSubmit(submitted);
              requestAnimationFrame(() => {
                inputsRef.current[0]?.focus();
              });
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
