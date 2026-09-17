import { Text, View } from 'react-native';

import { CURRENCY } from '@/constants/config';
import { useTheme } from '@/constants/theme';

interface AmountProps {
  value: number;
  size?: 'md' | 'lg' | 'xl' | 'stats' | 'mission' | 'balance';
  /** Couleurs adaptées à un fond ambre (green900) ou vert (blanc). */
  tone?: 'default' | 'onAmber' | 'green' | 'inverse';
  stacked?: boolean;
  /** Ex. « F » sur l’écran zem (compact). */
  currencySuffix?: string;
}

function formatThousands(value: number): string {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function Amount({
  value,
  size = 'lg',
  tone = 'default',
  stacked = false,
  currencySuffix,
}: AmountProps) {
  const theme = useTheme();
  const suffix = currencySuffix ?? CURRENCY;

  const valueColor =
    tone === 'onAmber'
      ? theme.colors.green900
      : tone === 'green'
        ? theme.colors.green700
        : tone === 'inverse'
          ? theme.colors.white
          : theme.colors.textPrimary;

  const currencyColor =
    tone === 'onAmber'
      ? theme.colors.green900
      : tone === 'green'
        ? theme.colors.green700
        : tone === 'inverse'
          ? theme.colors.white
          : theme.colors.textSecondary;

  const valueSize =
    size === 'balance'
      ? theme.layout.balanceAmount
      : size === 'xl'
        ? theme.layout.homeWalletAmount
        : size === 'stats'
          ? theme.layout.driverStatsValue
          : size === 'mission'
            ? theme.layout.driverMissionPayout
            : size === 'lg'
              ? theme.typography.amount.fontSize
              : theme.typography.subtitle.fontSize;

  const currencySize =
    size === 'md' || size === 'mission'
      ? theme.layout.homeActionSubtitle
      : size === 'balance'
        ? theme.typography.label.fontSize
        : theme.typography.caption.fontSize;

  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'flex-start' : 'baseline',
      }}>
      <Text
        style={{
          fontFamily: theme.fonts.poppinsBold,
          fontSize: valueSize,
          lineHeight: valueSize + theme.spacing.sm,
          color: valueColor,
        }}>
        {formatThousands(value)}
      </Text>
      <Text
        style={{
          fontFamily: theme.fonts.poppinsBold,
          fontSize: currencySize,
          lineHeight: currencySize + theme.spacing.sm,
          color: currencyColor,
          marginLeft: stacked ? 0 : theme.spacing.xs,
          marginTop: stacked ? theme.spacing.xs / 2 : 0,
          opacity:
            tone === 'onAmber' || tone === 'inverse'
              ? theme.layout.splashTaglineOpacity
              : 1,
        }}>
        {suffix}
      </Text>
    </View>
  );
}
