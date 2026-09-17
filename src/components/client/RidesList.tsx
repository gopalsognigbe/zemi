import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Navigation } from 'lucide-react-native';

import { EmptyState } from '@/components/shared/EmptyState';
import { MissionRow } from '@/components/shared/MissionRow';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { RideStatus } from '@/types';

interface RideListItem {
  id: string;
  pickup_label: string;
  destination_label: string;
  status: RideStatus;
  total_price: number | null;
  created_at: string;
}

function statusFr(status: RideStatus): string {
  switch (status) {
    case 'searching':
      return 'Recherche';
    case 'assigned':
      return 'Zem assigné';
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Terminée';
    case 'cancelled':
      return 'Annulée';
    default:
      return status;
  }
}

interface RidesListProps {
  /** Affiche le titre « Mes courses » (écran dédié). */
  showTitle?: boolean;
}

/**
 * Liste des courses client (logique inchangée — extraction pour Activité).
 */
export function RidesList({ showTitle = true }: RidesListProps) {
  const theme = useTheme();
  const { profile } = useAuth();
  const [rides, setRides] = useState<RideListItem[]>([]);
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
        .from('rides')
        .select(
          'id, pickup_label, destination_label, status, total_price, created_at',
        )
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Impossible de charger vos courses.');
        setRides([]);
      } else {
        setRides((data as RideListItem[]) ?? []);
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

  if (loading && rides.length === 0) {
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
          Chargement des courses…
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rides}
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
              Mes courses
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
          icon={Navigation}
          title="Aucune course"
          subtitle="Commandez une course pour la voir apparaître ici."
          actionLabel="Commander une course"
          onAction={() => router.push('/(client)/new-ride')}
        />
      }
      renderItem={({ item }) => (
        <MissionRow
          kind="ride"
          fromLabel={item.pickup_label}
          toLabel={item.destination_label}
          amount={item.total_price ?? 0}
          status={item.status}
          statusLabel={statusFr(item.status)}
          date={item.created_at}
          onPress={() =>
            router.push({
              pathname: '/(client)/ride-status',
              params: { rideId: item.id },
            })
          }
        />
      )}
    />
  );
}
