import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Banknote, Wallet, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceHeader } from '@/components/shared/BalanceHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { TransactionRow } from '@/components/shared/TransactionRow';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, getWallet } from '@/lib/wallet/walletApi';
import {
  getWithdrawals,
  requestWithdrawal,
  type WithdrawalRequest,
  type WithdrawalStatus,
} from '@/lib/wallet/withdrawApi';

interface EarningRow {
  id: string;
  amount: number;
  createdAt: string;
}

function formatTxDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(d);
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${day} · ${time}`;
}

function withdrawalStatusFr(status: WithdrawalStatus): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'paid':
      return 'Payé';
    case 'rejected':
      return 'Rejeté';
    default:
      return status;
  }
}

function withdrawalTone(
  status: WithdrawalStatus,
): 'pending' | 'paid' | 'rejected' {
  return status;
}

export default function DriverEarningsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);

  const [amountText, setAmountText] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.phone) {
      setMomoNumber((prev) => (prev ? prev : profile.phone));
    }
  }, [profile?.phone]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!profile?.id) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [bal, txs, reqs] = await Promise.all([
          getWallet(),
          getTransactions(),
          getWithdrawals(),
        ]);

        setBalance(bal);
        setWithdrawals(reqs);
        setEarnings(
          txs
            .filter((tx) => tx.type === 'earning')
            .map((tx) => ({
              id: tx.id,
              amount: Math.abs(tx.amount),
              createdAt: tx.createdAt,
            })),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger vos gains.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const parsedAmount = Number(amountText.replace(/\s/g, '').replace(',', '.'));
  const amountValid =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    Number.isInteger(parsedAmount);
  const canSubmit =
    amountValid &&
    parsedAmount <= balance &&
    momoNumber.replace(/\D/g, '').length >= 8 &&
    !submitting;

  function openWithdrawModal() {
    setFormError(null);
    setSuccess(null);
    setModalVisible(true);
  }

  async function handleWithdraw() {
    setFormError(null);
    setSuccess(null);

    if (!amountValid) {
      setFormError('Montant invalide.');
      return;
    }
    if (parsedAmount > balance) {
      setFormError('Solde insuffisant.');
      return;
    }
    if (momoNumber.replace(/\D/g, '').length < 8) {
      setFormError('Numéro Mobile Money invalide.');
      return;
    }

    setSubmitting(true);
    try {
      await requestWithdrawal(parsedAmount, momoNumber.trim());
      setAmountText('');
      setSuccess('Demande envoyée — vous serez payé sous peu.');
      setModalVisible(false);
      await load(true);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Échec de la demande de retrait.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.green700}
            colors={[theme.colors.green700]}
          />
        }>
        <BalanceHeader
          title="Mes gains"
          label="SOLDE DISPONIBLE"
          balance={balance}
          loading={loading && !refreshing}
          actionLabel="Demander un retrait"
          actionIcon={Banknote}
          onAction={openWithdrawModal}
        />

        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.xl,
          }}>
          {error ? (
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.brick,
                marginBottom: theme.spacing.md,
              }}>
              {error}
            </Text>
          ) : null}
          {success ? (
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.green700,
                marginBottom: theme.spacing.md,
              }}>
              {success}
            </Text>
          ) : null}

          <SectionHeader title="Mes demandes de retrait" />
          {withdrawals.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Aucune demande"
              subtitle="Demandez un retrait quand votre solde le permet."
              actionLabel="Demander un retrait"
              onAction={openWithdrawModal}
            />
          ) : (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.lg,
                marginBottom: theme.spacing.xl,
              }}>
              {withdrawals.map((item, index) => (
                <TransactionRow
                  key={item.id}
                  type="withdrawal_request"
                  title="Retrait Mobile Money"
                  subtitle={`${item.momoNumber} · ${formatTxDate(item.createdAt)}`}
                  amount={-Math.abs(item.amount)}
                  statusLabel={withdrawalStatusFr(item.status)}
                  statusTone={withdrawalTone(item.status)}
                  showSeparator={index < withdrawals.length - 1}
                />
              ))}
            </View>
          )}

          <SectionHeader title="Historique des gains" />
          {earnings.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Aucun gain"
              subtitle="Terminez des missions pour voir vos gains ici."
            />
          ) : (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.lg,
              }}>
              {earnings.map((item, index) => (
                <TransactionRow
                  key={item.id}
                  type="earning"
                  title="Gain"
                  subtitle={formatTxDate(item.createdAt)}
                  amount={item.amount}
                  showSeparator={index < earnings.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
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
            onPress={() => !submitting && setModalVisible(false)}
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
                justifyContent: 'space-between',
                marginBottom: theme.spacing.lg,
              }}>
              <Text
                style={{
                  fontFamily: theme.fonts.poppinsSemiBold,
                  fontSize: theme.layout.panelTitle,
                  color: theme.colors.textPrimary,
                  flex: 1,
                }}>
                Demander un retrait
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                disabled={submitting}
                onPress={() => setModalVisible(false)}
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

            <Input
              label="Montant"
              value={amountText}
              onChangeText={(text) => {
                setAmountText(text.replace(/[^\d]/g, ''));
                setFormError(null);
                setSuccess(null);
              }}
              placeholder="Ex. 1000"
              keyboardType="number-pad"
              editable={!submitting}
            />

            <Pressable
              accessibilityRole="button"
              disabled={balance <= 0 || submitting}
              onPress={() => {
                setAmountText(String(Math.floor(balance)));
                setFormError(null);
                setSuccess(null);
              }}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                minHeight: theme.layout.touchMin,
                justifyContent: 'center',
                marginBottom: theme.spacing.md,
                opacity: balance <= 0 || submitting ? 0.4 : pressed ? 0.7 : 1,
              })}>
              <Text
                style={{
                  fontFamily: theme.fonts.poppinsSemiBold,
                  fontSize: theme.layout.homeCaption,
                  color: theme.colors.green700,
                }}>
                Tout retirer
              </Text>
            </Pressable>

            <Input
              label="Numéro Mobile Money"
              value={momoNumber}
              onChangeText={(text) => {
                setMomoNumber(text);
                setFormError(null);
                setSuccess(null);
              }}
              placeholder="Ex. 97000000"
              keyboardType="phone-pad"
              editable={!submitting}
            />

            <View
              style={{
                backgroundColor: theme.colors.amber100,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.lg,
              }}>
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  fontSize: theme.layout.homeCaption,
                  lineHeight: theme.typography.caption.lineHeight + 2,
                  color: theme.colors.amber900,
                }}>
                Le versement est effectué manuellement sous 24 h ouvrées.
              </Text>
            </View>

            {formError ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaMedium,
                  fontSize: theme.typography.body.fontSize,
                  color: theme.colors.brick,
                  marginBottom: theme.spacing.md,
                }}>
                {formError}
              </Text>
            ) : null}

            <Button
              label="Envoyer la demande"
              variant="amber"
              loading={submitting}
              disabled={!canSubmit}
              onPress={handleWithdraw}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
