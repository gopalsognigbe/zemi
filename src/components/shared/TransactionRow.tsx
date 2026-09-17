import { Text, View } from 'react-native';
import {
  ArrowDownLeft,
  Banknote,
  Navigation,
  Package,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import { useTheme } from '@/constants/theme';
import type { WalletTxType } from '@/lib/wallet/walletApi';

export type TransactionStatusTone = 'pending' | 'paid' | 'rejected';

export interface TransactionRowProps {
  type: WalletTxType | 'withdrawal_request';
  title: string;
  subtitle: string;
  amount: number;
  showSeparator?: boolean;
  statusLabel?: string;
  statusTone?: TransactionStatusTone;
}

function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function iconForType(
  type: TransactionRowProps['type'],
): { Icon: LucideIcon; bg: 'green' | 'amber' | 'muted' } {
  switch (type) {
    case 'topup':
      return { Icon: ArrowDownLeft, bg: 'green' };
    case 'earning':
      return { Icon: Wallet, bg: 'green' };
    case 'refund':
      return { Icon: ShieldCheck, bg: 'green' };
    case 'ride_payment':
      return { Icon: Navigation, bg: 'amber' };
    case 'delivery_payment':
      return { Icon: Package, bg: 'amber' };
    case 'withdrawal':
    case 'withdrawal_request':
      return { Icon: Banknote, bg: 'amber' };
    case 'commission':
    case 'adjustment':
    default:
      return { Icon: Wallet, bg: 'muted' };
  }
}

/**
 * Ligne d'historique de transaction (portefeuille / gains).
 */
export function TransactionRow({
  type,
  title,
  subtitle,
  amount,
  showSeparator = true,
  statusLabel,
  statusTone,
}: TransactionRowProps) {
  const theme = useTheme();
  const { Icon, bg } = iconForType(type);
  const positive = amount > 0;
  const abs = Math.abs(amount);

  const iconBg =
    bg === 'green'
      ? theme.colors.green100
      : bg === 'amber'
        ? theme.colors.amber100
        : theme.colors.bg;
  const iconColor =
    bg === 'green'
      ? theme.colors.green700
      : bg === 'amber'
        ? theme.colors.amber900
        : theme.colors.textSecondary;

  const statusBg =
    statusTone === 'paid'
      ? theme.colors.green100
      : statusTone === 'rejected'
        ? theme.colors.dangerSoft
        : theme.colors.amber100;
  const statusColor =
    statusTone === 'paid'
      ? theme.colors.green700
      : statusTone === 'rejected'
        ? theme.colors.brick
        : theme.colors.amber900;

  return (
    <View
      style={{
        paddingVertical: theme.spacing.md,
        borderBottomWidth: showSeparator ? 1 : 0,
        borderBottomColor: theme.colors.border,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <View
          style={{
            width: theme.layout.txIconCircle,
            height: theme.layout.txIconCircle,
            borderRadius: theme.radius.pill,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}>
          <Icon
            size={theme.icon.size}
            strokeWidth={theme.icon.strokeWidth}
            color={iconColor}
          />
        </View>

        <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: theme.fonts.poppinsMedium,
              fontSize: theme.typography.body.fontSize,
              lineHeight: theme.typography.body.lineHeight,
              color: theme.colors.textPrimary,
            }}>
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              marginTop: theme.spacing.xs / 2,
              fontFamily: theme.fonts.jakartaRegular,
              fontSize: theme.layout.chatContextSize,
              color: theme.colors.textSecondary,
            }}>
            {subtitle}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.typography.body.fontSize,
            color: positive ? theme.colors.green500 : theme.colors.textPrimary,
          }}>
          {positive ? '+' : '−'}
          {formatThousands(abs)} F
        </Text>
      </View>

      {statusLabel ? (
        <View
          style={{
            marginTop: theme.spacing.sm,
            marginLeft: theme.layout.txIconCircle + theme.spacing.md,
            alignSelf: 'flex-start',
            backgroundColor: statusBg,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs / 2,
            minHeight: theme.layout.statusPillMinHeight,
            justifyContent: 'center',
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: theme.layout.chatContextSize,
              color: statusColor,
            }}>
            {statusLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
