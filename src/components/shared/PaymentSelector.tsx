import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Banknote, Wallet } from 'lucide-react-native';

import { CURRENCY } from '@/constants/config';
import { useTheme } from '@/constants/theme';
import type { PaymentMethod } from '@/types';

export interface PaymentSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  balance?: number;
  price?: number;
  walletOnly?: boolean;
}

/**
 * Sélecteur Espèces / Solde ZEMi (pas de Mobile Money direct).
 */
export function PaymentSelector({
  value,
  onChange,
  balance,
  price,
  walletOnly = false,
}: PaymentSelectorProps) {
  const theme = useTheme();
  const insufficient =
    price != null && balance != null && balance < price;

  function Option({
    method,
    label,
    icon,
    subtitle,
    disabled,
    fullWidth,
  }: {
    method: PaymentMethod;
    label: string;
    icon: typeof Banknote;
    subtitle?: string;
    disabled?: boolean;
    fullWidth?: boolean;
  }) {
    const Icon = icon;
    const selected = value === method;
    const activeColors = selected
      ? {
          bg: theme.colors.green700,
          border: theme.colors.green700,
          text: theme.colors.white,
          icon: theme.colors.white,
        }
      : {
          bg: theme.colors.surface,
          border: theme.colors.border,
          text: theme.colors.textPrimary,
          icon: theme.colors.textPrimary,
        };

    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => onChange(method)}
        style={({ pressed }) => ({
          flex: fullWidth ? undefined : 1,
          width: fullWidth ? '100%' : undefined,
          minHeight: theme.layout.paymentOptionHeight,
          height: theme.layout.paymentOptionHeight,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: activeColors.border,
          backgroundColor: activeColors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.sm,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
        })}>
        <Icon
          size={theme.icon.size}
          strokeWidth={theme.icon.strokeWidth}
          color={activeColors.icon}
        />
        <Text
          style={{
            marginTop: theme.spacing.xs,
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.layout.homeActionSubtitle + 1,
            color: activeColors.text,
          }}>
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              fontSize: theme.layout.tabLabel,
              color: selected
                ? theme.colors.white
                : theme.colors.textSecondary,
              opacity: selected ? 0.85 : 1,
            }}
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  if (walletOnly) {
    return (
      <View>
        <Option
          method="wallet"
          label="Solde ZEMi"
          icon={Wallet}
          subtitle={
            balance != null
              ? `${Math.round(balance)} ${CURRENCY}`
              : 'Chargement…'
          }
          disabled={insufficient}
          fullWidth
        />
        {insufficient ? (
          <View
            style={{
              marginTop: theme.spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
            }}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.typography.caption.fontSize,
                color: theme.colors.brick,
              }}>
              Solde insuffisant
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/(client)/wallet')}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaSemiBold,
                  fontSize: theme.typography.caption.fontSize,
                  color: theme.colors.green700,
                  textDecorationLine: 'underline',
                }}>
                Recharger
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Option method="cash" label="Espèces" icon={Banknote} />
        <Option
          method="wallet"
          label="Solde ZEMi"
          icon={Wallet}
          subtitle={
            balance != null
              ? `${Math.round(balance)} ${CURRENCY}`
              : undefined
          }
          disabled={insufficient}
        />
      </View>
      {insufficient ? (
        <View
          style={{
            marginTop: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.typography.caption.fontSize,
              color: theme.colors.brick,
            }}>
            Solde insuffisant
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/(client)/wallet')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaSemiBold,
                fontSize: theme.typography.caption.fontSize,
                color: theme.colors.green700,
                textDecorationLine: 'underline',
              }}>
              Recharger
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
