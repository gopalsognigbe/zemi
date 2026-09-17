import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface DriverStats {
  rating_avg: number;
  rating_count: number;
}

interface RatingRow {
  id: string;
  stars: number;
  remark: string | null;
  job_type: 'ride' | 'delivery';
  created_at: string;
}

function formatRatingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function formatAvg(avg: number): string {
  return Number(avg).toFixed(1).replace('.', ',');
}

function jobTypeLabel(type: RatingRow['job_type']): string {
  return type === 'delivery' ? 'Livraison' : 'Course';
}

export default function DriverRatingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
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

      const [driverRes, ratingsRes] = await Promise.all([
        supabase
          .from('drivers')
          .select('rating_avg, rating_count')
          .eq('user_id', profile.id)
          .maybeSingle(),
        supabase
          .from('ratings')
          .select('id, stars, remark, job_type, created_at')
          .eq('driver_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

      if (driverRes.error || ratingsRes.error) {
        setError('Impossible de charger vos notes.');
        setStats(null);
        setRatings([]);
      } else {
        setStats(
          driverRes.data
            ? {
                rating_avg: Number(driverRes.data.rating_avg) || 0,
                rating_count: Number(driverRes.data.rating_count) || 0,
              }
            : { rating_avg: 0, rating_count: 0 },
        );
        setRatings((ratingsRes.data as RatingRow[]) ?? []);
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

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const row of ratings) {
      const stars = Math.min(5, Math.max(1, Math.round(row.stars)));
      counts[stars - 1] += 1;
    }
    const total = ratings.length || 1;
    return [5, 4, 3, 2, 1].map((level) => ({
      level,
      count: counts[level - 1],
      ratio: counts[level - 1] / total,
    }));
  }, [ratings]);

  if (loading && !stats) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.bg,
          padding: theme.spacing.lg,
        }}>
        <ActivityIndicator color={theme.colors.green700} />
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.textSecondary,
          }}>
          Chargement des notes…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: theme.spacing.xxl,
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
            <View
              style={{
                backgroundColor: theme.colors.green700,
                paddingTop: insets.top + theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
                paddingBottom: theme.spacing.xl,
                borderBottomLeftRadius: theme.radius.xxl,
                borderBottomRightRadius: theme.radius.xxl,
                alignItems: 'center',
              }}>
              {stats && stats.rating_count > 0 ? (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}>
                    <Text
                      style={{
                        fontFamily: theme.fonts.poppinsBold,
                        fontSize: theme.layout.ratingsAvg,
                        lineHeight:
                          theme.layout.ratingsAvg + theme.spacing.sm,
                        color: theme.colors.white,
                      }}>
                      {formatAvg(stats.rating_avg)}
                    </Text>
                    <Star
                      size={theme.layout.driverToggleIcon}
                      color={theme.colors.amber500}
                      fill={theme.colors.amber500}
                      strokeWidth={theme.icon.strokeWidth}
                    />
                  </View>
                  <Text
                    style={{
                      marginTop: theme.spacing.sm,
                      fontFamily: theme.fonts.jakartaRegular,
                      fontSize: theme.typography.body.fontSize,
                      color: theme.colors.white,
                      opacity: theme.layout.splashTaglineOpacity,
                    }}>
                    sur {stats.rating_count} avis
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      fontFamily: theme.fonts.poppinsSemiBold,
                      fontSize: theme.typography.subtitle.fontSize,
                      color: theme.colors.white,
                      textAlign: 'center',
                    }}>
                    Pas encore de note
                  </Text>
                  <Text
                    style={{
                      marginTop: theme.spacing.sm,
                      fontFamily: theme.fonts.jakartaRegular,
                      fontSize: theme.typography.body.fontSize,
                      color: theme.colors.white,
                      opacity: theme.layout.splashTaglineOpacity,
                      textAlign: 'center',
                    }}>
                    Vos premières missions feront votre réputation.
                  </Text>
                </>
              )}
            </View>

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

              {ratings.length > 0 ? (
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.xl,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.xl,
                  }}>
                  {distribution.map((row) => (
                    <View
                      key={row.level}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: theme.spacing.sm,
                        gap: theme.spacing.sm,
                      }}>
                      <Text
                        style={{
                          width: theme.spacing.lg,
                          fontFamily: theme.fonts.poppinsSemiBold,
                          fontSize: theme.typography.label.fontSize,
                          color: theme.colors.textPrimary,
                        }}>
                        {row.level}
                      </Text>
                      <View
                        style={{
                          flex: 1,
                          height: theme.spacing.sm,
                          borderRadius: theme.radius.pill,
                          backgroundColor: theme.colors.green100,
                          overflow: 'hidden',
                        }}>
                        <View
                          style={{
                            width: `${Math.round(row.ratio * 100)}%`,
                            height: '100%',
                            backgroundColor: theme.colors.amber500,
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          minWidth: theme.spacing.xl,
                          textAlign: 'right',
                          fontFamily: theme.fonts.jakartaMedium,
                          fontSize: theme.layout.chatContextSize,
                          color: theme.colors.textSecondary,
                        }}>
                        {row.count}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <SectionHeader title="Avis reçus" />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <EmptyState
              icon={Star}
              title="Aucun avis"
              subtitle="Vos premières missions feront votre réputation."
            />
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              marginHorizontal: theme.spacing.lg,
              marginBottom: theme.spacing.md,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing.md,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs / 2,
                marginBottom: item.remark ? theme.spacing.sm : theme.spacing.sm,
              }}>
              {Array.from({ length: 5 }, (_, index) => {
                const filled = index < item.stars;
                return (
                  <Star
                    key={index}
                    size={theme.layout.homeCaption + 2}
                    color={theme.colors.amber500}
                    fill={filled ? theme.colors.amber500 : theme.colors.surface}
                    strokeWidth={theme.icon.strokeWidth}
                  />
                );
              })}
            </View>
            {item.remark ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  fontSize: theme.typography.label.fontSize,
                  lineHeight: theme.typography.label.lineHeight + 2,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing.sm,
                }}>
                {item.remark}
              </Text>
            ) : null}
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                fontSize: theme.layout.chatContextSize,
                color: theme.colors.textSecondary,
              }}>
              {jobTypeLabel(item.job_type)} · {formatRatingDate(item.created_at)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
