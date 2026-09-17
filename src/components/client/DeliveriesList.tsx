import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Package } from 'lucide-react-native';

import { EmptyState } from '@/components/shared/EmptyState';
import { MissionRow } from '@/components/shared/MissionRow';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { DeliveryStatus } from '@/types';

interface DeliveryListItem {
  id: string;
  delivery_type: 'livraison_simple' | 'livraison_express';
  pickup_label: string;
  dropoff_label: string;
  status: DeliveryStatus;
  total_price: number | null;
  created_at: string;
}

function statusFr(status: DeliveryStatus): string {
  switch (status) {
    case 'created':
      return 'Recherche';
    case 'assigned':
      return 'Zem assigné';
    case 'picked_up':
      return 'En route';
    case 'delivered':
      return 'Livrée';
    case 'cancelled':
      return 'Annulée';
    case 'failed':
      return 'Échouée';
    default:
      return status;
  }
}

interface DeliveriesListProps {
  /** Affiche le titre « Mes livraisons » (écran dédié). */
  showTitle?: boolean;
}

/**
 * Liste des livraisons client (logique inchangée — extraction pour Activité).
 */
export function DeliveriesList({ showTitle = true }: DeliveriesListProps) {
  const theme = useTheme();
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!profile?.id) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('deliveries')
        .select(
          'id, delivery_type, pickup_label, dropoff_label, status, total_price, created_at',
        )
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Impossible de charger vos livraisons.');
        setDeliveries([]);
      } else {
        setDeliveries((data as DeliveryListItem[]) ?? []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [profile?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading && deliveries.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
        }}>
        <ActivityIndicator color={theme.colors.green700} />
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.textSecondary,
          }}>
          Chargement des livraisons…
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={deliveries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
        flexGrow: 1,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={theme.colors.green700}
          colors={[theme.colors.green700]}
        />
      }
      ListHeaderComponent={
        <>
          {showTitle ? (
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.typography.title.fontSize,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing.lg,
              }}>
              Mes livraisons
            </Text>
          ) : null}
          {error ? (
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.brick,
                marginBottom: theme.spacing.sm,
              }}>
              {error}
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <EmptyState
          icon={Package}
          title="Aucun colis"
          subtitle="Envoyez un colis pour le voir apparaître ici."
          actionLabel="Envoyer un colis"
          onAction={() => router.push('/(client)/new-delivery')}
        />
      }
      renderItem={({ item }) => (
        <MissionRow
          kind="delivery"
          fromLabel={item.pickup_label}
          toLabel={item.dropoff_label}
          amount={item.total_price ?? 0}
          status={item.status}
          statusLabel={statusFr(item.status)}
          date={item.created_at}
          badge={
            item.delivery_type === 'livraison_express' ? 'Express' : undefined
          }
          onPress={() =>
            router.push({
              pathname: '/(client)/delivery-status',
              params: { deliveryId: item.id },
            })
          }
        />
      )}
    />
  );
}
