import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, ShieldAlert, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackingMap } from '@/components/shared/TrackingMap';
import { MissionCodeBanner } from '@/components/shared/MissionCodeBanner';
import { ActionSheet } from '@/components/tracking/ActionSheet';
import { DriverCard } from '@/components/tracking/DriverCard';
import { RatingBlock } from '@/components/tracking/RatingBlock';
import { StatusPill } from '@/components/tracking/StatusPill';
import { TripSummaryRow } from '@/components/tracking/TripSummaryRow';
import { Button } from '@/components/ui/Button';
import { ACTIVE_RIDE_KEY } from '@/constants/storage';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useDriverPosition } from '@/hooks/useDriverPosition';
import { useRealtimeRow } from '@/hooks/useRealtimeRow';
import { estimateEtaMinutes, formatEta } from '@/lib/geo/eta';
import {
  CANCEL_REASONS,
  REPORT_REASONS,
  cancelRide,
  reportIssue,
} from '@/lib/missions/missionActions';
import { supabase } from '@/lib/supabase';
import type { RideStatus } from '@/types';

interface RideRow {
  id: string;
  client_id: string;
  driver_id: string | null;
  pickup_lat: number;
  pickup_lng: number;
  pickup_label: string;
  destination_lat: number;
  destination_lng: number;
  destination_label: string;
  status: RideStatus;
  total_price: number | null;
  start_code: string | null;
}

interface DriverPublicRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  vehicle_label: string | null;
}

type SheetKind = 'cancel' | 'report' | null;

export default function RideStatusScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ rideId?: string | string[] }>();
  const paramRideId = Array.isArray(params.rideId)
    ? params.rideId[0]
    : params.rideId;

  const [rideId, setRideId] = useState<string | undefined>(paramRideId);
  const [driver, setDriver] = useState<DriverPublicRow | null>(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSent, setRatingSent] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const { row: ride, loading, error, refresh } = useRealtimeRow<RideRow>(
    'rides',
    rideId,
  );

  const trackDriver =
    ride?.status === 'assigned' || ride?.status === 'in_progress';
  const { position: driverPosition } = useDriverPosition(
    trackDriver ? (ride?.driver_id ?? undefined) : undefined,
  );

  useEffect(() => {
    let cancelled = false;
    async function resolveId() {
      if (paramRideId) {
        setRideId(paramRideId);
        await AsyncStorage.setItem(ACTIVE_RIDE_KEY, paramRideId);
        return;
      }
      const stored = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
      if (!cancelled && stored) {
        setRideId(stored);
      }
    }
    void resolveId();
    return () => {
      cancelled = true;
    };
  }, [paramRideId]);

  const loadDriver = useCallback(async (driverId: string) => {
    setDriverLoading(true);
    const { data } = await supabase
      .from('driver_public')
      .select(
        'id, full_name, avatar_url, rating_avg, rating_count, vehicle_label',
      )
      .eq('id', driverId)
      .maybeSingle();

    if (data) {
      setDriver(data as DriverPublicRow);
    }
    setDriverLoading(false);
  }, []);

  useEffect(() => {
    if (
      ride?.driver_id &&
      (ride.status === 'assigned' ||
        ride.status === 'in_progress' ||
        ride.status === 'completed')
    ) {
      void loadDriver(ride.driver_id);
    }
  }, [ride?.driver_id, ride?.status, loadDriver]);

  useEffect(() => {
    if (ride?.status === 'completed' || ride?.status === 'cancelled') {
      void AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
    }
  }, [ride?.status]);

  const pickup = ride
    ? { lat: Number(ride.pickup_lat), lng: Number(ride.pickup_lng) }
    : null;
  const destination = ride
    ? {
        lat: Number(ride.destination_lat),
        lng: Number(ride.destination_lng),
      }
    : null;

  const pill = useMemo(() => {
    if (!ride) {
      return { label: 'Chargement…', variant: 'searching' as const };
    }
    switch (ride.status) {
      case 'searching':
        return {
          label: 'Recherche d’un zem…',
          variant: 'searching' as const,
        };
      case 'assigned': {
        if (driverPosition && pickup) {
          const eta = formatEta(
            estimateEtaMinutes(driverPosition, pickup),
          );
          return {
            label: `Votre zem arrive · ${eta}`,
            variant: 'active' as const,
          };
        }
        return {
          label: 'Votre zem arrive',
          variant: 'active' as const,
        };
      }
      case 'in_progress': {
        if (driverPosition && destination) {
          const eta = formatEta(
            estimateEtaMinutes(driverPosition, destination),
          );
          return {
            label: `En route · ${eta}`,
            variant: 'active' as const,
          };
        }
        return { label: 'En route', variant: 'active' as const };
      }
      case 'completed':
        return {
          label: 'Course terminée',
          variant: 'done' as const,
        };
      case 'cancelled':
        return {
          label: 'Course annulée',
          variant: 'cancelled' as const,
        };
      default:
        return { label: ride.status, variant: 'searching' as const };
    }
  }, [ride, driverPosition, pickup, destination]);

  async function handleSubmitRating(stars: number, remark: string) {
    if (!ride?.driver_id || !profile?.id || stars < 1 || ratingSent) return;

    setRatingError(null);
    setSubmittingRating(true);

    const { error: insertError } = await supabase.from('ratings').insert({
      driver_id: ride.driver_id,
      author_id: profile.id,
      job_type: 'ride',
      job_id: ride.id,
      stars,
      remark: remark || null,
    });

    setSubmittingRating(false);

    if (insertError) {
      setRatingError('Impossible d’envoyer la note. Réessayez.');
      return;
    }

    setRatingSent(true);
    await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
  }

  function goHome() {
    router.replace('/(client)/home');
  }

  async function handleCancel(reason: string) {
    if (!ride) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await cancelRide(ride.id, reason);
      setSheet(null);
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Impossible d'annuler la course.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReport(reason: string, details: string) {
    if (!ride?.driver_id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await reportIssue({
        targetId: ride.driver_id,
        jobType: 'ride',
        jobId: ride.id,
        reason,
        details,
      });
      setSheet(null);
      Alert.alert(
        'Signalement envoyé',
        'Notre équipe va l’examiner.',
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer le signalement.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function openChat() {
    if (!ride?.driver_id || !driver) return;
    router.push({
      pathname: '/(client)/chat',
      params: {
        threadType: 'ride',
        threadId: ride.id,
        receiverId: ride.driver_id,
        name: driver.full_name,
      },
    });
  }

  if (!rideId) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.bg,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        }}>
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            color: theme.colors.brick,
          }}>
          Aucune course en suivi.
        </Text>
        <Button label="Retour à l'accueil" onPress={goHome} />
      </View>
    );
  }

  if (loading && !ride) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.bg,
          gap: theme.spacing.md,
        }}>
        <ActivityIndicator color={theme.colors.green700} size="large" />
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            color: theme.colors.textSecondary,
          }}>
          Chargement de la course…
        </Text>
      </View>
    );
  }

  const showDriverCard =
    ride?.status === 'assigned' || ride?.status === 'in_progress';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {ride && pickup && destination ? (
        <TrackingMap
          pickup={pickup}
          destination={destination}
          driverPosition={trackDriver ? driverPosition : null}
          height="fill"
          bottomPadding={theme.layout.mapPanelClearance}
          pickupLabel="Départ"
          destinationLabel="Destination"
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.border }} />
      )}

      <StatusPill label={pill.label} variant={pill.variant} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={() => router.back()}
        style={({ pressed }) => ({
          position: 'absolute',
          top: insets.top + theme.spacing.sm,
          left: theme.spacing.lg,
          width: theme.layout.backFab,
          height: theme.layout.backFab,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.white,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          opacity: pressed ? 0.85 : 1,
          ...theme.shadow.soft,
        })}>
        <ArrowLeft
          size={theme.icon.size}
          color={theme.colors.green900}
          strokeWidth={theme.icon.strokeWidth}
        />
      </Pressable>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.layout.panelTopRadius,
          borderTopRightRadius: theme.layout.panelTopRadius,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.lg,
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 10,
          gap: theme.spacing.md,
        }}>
        {error ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              color: theme.colors.brick,
              textAlign: 'center',
            }}>
            {error}
          </Text>
        ) : null}
        {actionError ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaRegular,
              color: theme.colors.brick,
              textAlign: 'center',
            }}>
            {actionError}
          </Text>
        ) : null}

        {ride?.status === 'searching' ? (
          <>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.panelTitle,
                color: theme.colors.textPrimary,
              }}>
              Nous cherchons un zem pour vous
            </Text>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                color: theme.colors.textSecondary,
              }}>
              Patientez quelques instants près de {ride.pickup_label}.
            </Text>
            <TripSummaryRow
              label="DESTINATION"
              value={ride.destination_label}
              price={ride.total_price ?? undefined}
              icon={
                <MapPin
                  size={theme.icon.size}
                  color={theme.colors.brick}
                  strokeWidth={theme.icon.strokeWidth}
                />
              }
            />
            <Button
              label="Annuler la course"
              variant="secondary"
              onPress={() => {
                setActionError(null);
                setSheet('cancel');
              }}
            />
          </>
        ) : null}

        {showDriverCard && ride ? (
          <>
            <DriverCard
              driver={
                driver
                  ? {
                      fullName: driver.full_name,
                      avatarUrl: driver.avatar_url,
                      ratingAvg: driver.rating_avg,
                      ratingCount: driver.rating_count,
                      vehicleLabel: driver.vehicle_label,
                    }
                  : null
              }
              loading={driverLoading && !driver}
              onMessage={openChat}
              callDisabled
            />
            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.border,
              }}
            />
            <TripSummaryRow
              label="DESTINATION"
              value={ride.destination_label}
              price={ride.total_price ?? undefined}
              icon={
                <MapPin
                  size={theme.icon.size}
                  color={theme.colors.brick}
                  strokeWidth={theme.icon.strokeWidth}
                />
              }
            />

            {ride.status === 'assigned' && ride.start_code ? (
              <MissionCodeBanner
                label="Code de départ"
                code={ride.start_code}
                hint="Communiquez ce code à votre zem pour démarrer la course."
              />
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: theme.spacing.sm,
                marginTop: theme.spacing.xs,
              }}>
              {ride.status === 'assigned' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setActionError(null);
                      setSheet('cancel');
                    }}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      minHeight: theme.layout.touchMin,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <X
                      size={theme.layout.homeCaption}
                      color={theme.colors.textSecondary}
                      strokeWidth={theme.icon.strokeWidth}
                    />
                    <Text
                      style={{
                        marginLeft: theme.spacing.xs,
                        fontFamily: theme.fonts.jakartaRegular,
                        fontSize: theme.layout.homeCaption,
                        color: theme.colors.textSecondary,
                      }}>
                      Annuler
                    </Text>
                  </Pressable>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.layout.homeCaption,
                    }}>
                    ·
                  </Text>
                </>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActionError(null);
                  setSheet('report');
                }}
                hitSlop={8}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: theme.layout.touchMin,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <ShieldAlert
                  size={theme.layout.homeCaption}
                  color={theme.colors.textSecondary}
                  strokeWidth={theme.icon.strokeWidth}
                />
                <Text
                  style={{
                    marginLeft: theme.spacing.xs,
                    fontFamily: theme.fonts.jakartaRegular,
                    fontSize: theme.layout.homeCaption,
                    color: theme.colors.textSecondary,
                  }}>
                  Signaler
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {ride?.status === 'completed' ? (
          <RatingBlock
            title="Comment s'est passée votre course ?"
            onSubmit={(stars, remark) => void handleSubmitRating(stars, remark)}
            submitting={submittingRating}
            submitted={ratingSent}
            error={ratingError}
            onGoHome={goHome}
          />
        ) : null}

        {ride?.status === 'cancelled' ? (
          <>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.panelTitle,
                color: theme.colors.textPrimary,
                textAlign: 'center',
              }}>
              Cette course a été annulée.
            </Text>
            <Button label="Retour à l'accueil" onPress={goHome} />
          </>
        ) : null}

        {!ride && error ? (
          <Button label="Réessayer" onPress={() => void refresh()} />
        ) : null}
      </View>

      <ActionSheet
        visible={sheet === 'cancel'}
        title="Annuler la course"
        description="Choisissez un motif d’annulation."
        reasons={CANCEL_REASONS}
        confirmLabel="Confirmer l'annulation"
        destructive
        loading={actionLoading}
        onClose={() => setSheet(null)}
        onConfirm={(reason) => void handleCancel(reason)}
      />

      <ActionSheet
        visible={sheet === 'report'}
        title="Signaler un problème"
        description="Décrivez ce qui s’est passé. Notre équipe examinera le signalement."
        reasons={REPORT_REASONS}
        confirmLabel="Envoyer le signalement"
        loading={actionLoading}
        onClose={() => setSheet(null)}
        onConfirm={(reason, details) => void handleReport(reason, details)}
      />
    </View>
  );
}
