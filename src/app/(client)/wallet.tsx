import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Wallet, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceHeader } from '@/components/shared/BalanceHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { TransactionRow } from '@/components/shared/TransactionRow';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  getTransactions,
  getWallet,
  topUp,
  type WalletTransaction,
  type WalletTxType,
} from '@/lib/wallet/walletApi';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

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

function formatQuickAmount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function baseTxLabel(type: WalletTxType): string {
  switch (type) {
    case 'topup':
      return 'Recharge Mobile Money';
    case 'ride_payment':
      return 'Course';
    case 'delivery_payment':
      return 'Colis';
    case 'earning':
      return 'Gain';
    case 'withdrawal':
      return 'Retrait';
    case 'refund':
      return 'Remboursement';
    case 'commission':
      return 'Commission';
    case 'adjustment':
      return 'Correction';
    default:
      return type;
  }
}

/** Affiche un montant signé même si la BDD stocke parfois la valeur absolue. */
function signedDisplayAmount(type: WalletTxType, amount: number): number {
  const abs = Math.abs(amount);
  switch (type) {
    case 'topup':
    case 'earning':
    case 'refund':
      return abs;
    case 'ride_payment':
    case 'delivery_payment':
    case 'withdrawal':
    case 'commission':
      return -abs;
    case 'adjustment':
    default:
      return amount;
  }
}

async function fetchRouteLabels(
  txs: WalletTransaction[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();

  const rideIds = [
    ...new Set(
      txs
        .filter((tx) => tx.type === 'ride_payment' && tx.refId)
        .map((tx) => tx.refId as string),
    ),
  ];
  const deliveryIds = [
    ...new Set(
      txs
        .filter((tx) => tx.type === 'delivery_payment' && tx.refId)
        .map((tx) => tx.refId as string),
    ),
  ];

  const [ridesRes, deliveriesRes] = await Promise.all([
    rideIds.length > 0
      ? supabase
          .from('rides')
          .select('id, pickup_label, destination_label')
          .in('id', rideIds)
      : Promise.resolve({ data: null, error: null }),
    deliveryIds.length > 0
      ? supabase
          .from('deliveries')
          .select('id, pickup_label, dropoff_label')
          .in('id', deliveryIds)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (ridesRes.data) {
    for (const row of ridesRes.data as {
      id: string;
      pickup_label: string;
      destination_label: string;
    }[]) {
      labels.set(
        row.id,
        `Course · ${row.pickup_label} → ${row.destination_label}`,
      );
    }
  }

  if (deliveriesRes.data) {
    for (const row of deliveriesRes.data as {
      id: string;
      pickup_label: string;
      dropoff_label: string;
    }[]) {
      labels.set(
        row.id,
        `Colis · ${row.pickup_label} → ${row.dropoff_label}`,
      );
    }
  }

  return labels;
}

export default function ClientWalletScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [routeLabels, setRouteLabels] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [toppingUp, setToppingUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [walletBalance, txs] = await Promise.all([
        getWallet(),
        getTransactions(),
      ]);
      const labels = await fetchRouteLabels(txs);
      setBalance(walletBalance);
      setTransactions(txs);
      setRouteLabels(labels);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de charger le compte.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const openTopUp = useCallback(() => {
    setMessage(null);
    setError(null);
    setModalVisible(true);
  }, []);

  async function handleTopUp() {
    setMessage(null);
    setError(null);

    const amount = Number(amountText.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Saisissez un montant valide supérieur à 0.');
      return;
    }

    setToppingUp(true);
    try {
      const newBalance = await topUp(amount);
      setBalance(newBalance);
      setAmountText('');
      setMessage(`Recharge de ${formatQuickAmount(amount)} FCFA effectuée.`);
      setModalVisible(false);
      const txs = await getTransactions();
      const labels = await fetchRouteLabels(txs);
      setTransactions(txs);
      setRouteLabels(labels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la recharge.');
    } finally {
      setToppingUp(false);
    }
  }

  const rows = useMemo(
    () =>
      transactions.map((tx) => {
        const base = baseTxLabel(tx.type);
        const enriched =
          tx.refId && routeLabels.has(tx.refId)
            ? (routeLabels.get(tx.refId) as string)
            : base;
        return {
          ...tx,
          title: enriched,
        };
      }),
    [transactions, routeLabels],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(true)}
            tintColor={theme.colors.green700}
            colors={[theme.colors.green700]}
          />
        }>
        <BalanceHeader
          title="Mon portefeuille"
          label="SOLDE DISPONIBLE"
          balance={balance}
          loading={loading && !refreshing}
          actionLabel="Recharger mon compte"
          actionIcon={Plus}
          onAction={openTopUp}
        />

        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
          {message ? (
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.green700,
                marginBottom: theme.spacing.md,
              }}>
              {message}
            </Text>
          ) : null}
          {error && !modalVisible ? (
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

          <SectionHeader title="Historique" />

          {loading && transactions.length === 0 ? (
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.textSecondary,
              }}>
              Chargement…
            </Text>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Aucune transaction"
              subtitle="Rechargez votre compte pour commencer."
              actionLabel="Recharger"
              onAction={openTopUp}
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
              {rows.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  type={tx.type}
                  title={tx.title}
                  subtitle={formatTxDate(tx.createdAt)}
                  amount={signedDisplayAmount(tx.type, tx.amount)}
                  showSeparator={index < rows.length - 1}
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
            onPress={() => !toppingUp && setModalVisible(false)}
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
                Recharger mon compte
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                disabled={toppingUp}
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

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.md,
              }}>
              {QUICK_AMOUNTS.map((value) => {
                const selected = amountText === String(value);
                return (
                  <Pressable
                    key={value}
                    disabled={toppingUp}
                    onPress={() => setAmountText(String(value))}
                    style={{
                      minHeight: theme.layout.touchMin,
                      paddingHorizontal: theme.spacing.md,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      borderColor: selected
                        ? theme.colors.green700
                        : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.amber100
                        : theme.colors.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text
                      style={{
                        fontFamily: selected
                          ? theme.fonts.poppinsSemiBold
                          : theme.fonts.jakartaMedium,
                        fontSize: theme.typography.caption.fontSize,
                        color: selected
                          ? theme.colors.green900
                          : theme.colors.textPrimary,
                      }}>
                      {formatQuickAmount(value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Autre montant"
              value={amountText}
              onChangeText={setAmountText}
              placeholder="Ex. 1500"
              keyboardType="numeric"
              editable={!toppingUp}
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
                Recharge de test — le paiement Mobile Money sera activé
                prochainement.
              </Text>
            </View>

            {error && modalVisible ? (
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

            <Button
              label="Valider la recharge"
              variant="amber"
              loading={toppingUp}
              disabled={toppingUp || loading}
              onPress={handleTopUp}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
