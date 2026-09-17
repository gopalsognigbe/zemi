import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
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
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CURRENCY } from '@/constants/config';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useDriverPosition } from '@/hooks/useDriverPosition';
import { useRealtimeRow } from '@/hooks/useRealtimeRow';
import { estimateEtaMinutes, formatEta } from '@/lib/geo/eta';
import {
  CANCEL_REASONS,
  REPORT_REASONS,
  cancelDelivery,
  reportIssue,
} from '@/lib/missions/missionActions';
import { supabase } from '@/lib/supabase';
import type { DeliveryStatus } from '@/types';

interface DeliveryRow {
  id: string;
  sender_id: string;
  driver_id: string | null;
  delivery_type: 'livraison_simple' | 'livraison_express';
  pickup_lat: number;
  pickup_lng: number;
  pickup_label: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_label: string;
  package_description: string | null;
  package_photo_url: string | null;
  status: DeliveryStatus;
  total_price: number | null;
  delivery_code: string | null;
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

export default function DeliveryStatusScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ deliveryId?: string | string[] }>();
  const deliveryId = Array.isArray(params.deliveryId)
    ? params.deliveryId[0]
    : params.deliveryId;

  const [driver, setDriver] = useState<DriverPublicRow | null>(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSent, setRatingSent] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const {
    row: delivery,
    loading,
    error,
    refresh,
  } = useRealtimeRow<DeliveryRow>('deliveries', deliveryId);

  const trackDriver =
    delivery?.status === 'assigned' || delivery?.status === 'picked_up';
  const { position: driverPosition } = useDriverPosition(
    trackDriver ? (delivery?.driver_id ?? undefined) : undefined,
  );

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
      delivery?.driver_id &&
      (delivery.status === 'assigned' ||
        delivery.status === 'picked_up' ||
        delivery.status === 'delivered')
    ) {
      void loadDriver(delivery.driver_id);
    }
  }, [delivery?.driver_id, delivery?.status, loadDriver]);

  const pickup = delivery
    ? { lat: Number(delivery.pickup_lat), lng: Number(delivery.pickup_lng) }
    : null;
  const dropoff = delivery
    ? { lat: Number(delivery.dropoff_lat), lng: Number(delivery.dropoff_lng) }
    : null;

  const pill = useMemo(() => {
    if (!delivery) {
      return { label: 'Chargement…', variant: 'searching' as const };
    }
    switch (delivery.status) {
      case 'created':
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
            label: `Le zem arrive · ${eta}`,
            variant: 'active' as const,
          };
        }
        return {
          label: 'Le zem arrive',
          variant: 'active' as const,
        };
      }
      case 'picked_up': {
        if (driverPosition && dropoff) {
          const eta = formatEta(
            estimateEtaMinutes(driverPosition, dropoff),
          );
          return {
            label: `Colis en route · ${eta}`,
            variant: 'active' as const,
          };
        }
        return {
          label: 'Colis en route',
          variant: 'active' as const,
        };
      }
      case 'delivered':
        return {
          label: 'Colis livré',
          variant: 'done' as const,
        };
      case 'cancelled':
        return {
          label: 'Livraison annulée',
          variant: 'cancelled' as const,
        };
      case 'failed':
        return {
          label: 'Livraison échouée',
          variant: 'cancelled' as const,
        };
      default:
        return { label: delivery.status, variant: 'searching' as const };
    }
  }, [delivery, driverPosition, pickup, dropoff]);

  async function handleSubmitRating(stars: number, remark: string) {
    if (!delivery?.driver_id || !profile?.id || stars < 1 || ratingSent) return;

    setRatingError(null);
    setSubmittingRating(true);

    const { error: insertError } = await supabase.from('ratings').insert({
      driver_id: delivery.driver_id,
      author_id: profile.id,
      job_type: 'delivery',
      job_id: delivery.id,
      stars,
      remark: remark || null,
    });

    setSubmittingRating(false);

    if (insertError) {
      setRatingError('Impossible d’envoyer la note. Réessayez.');
      return;
    }

    setRatingSent(true);
  }

  function goHome() {
    router.replace('/(client)/home');
  }

  async function handleCancel(reason: string) {
    if (!delivery) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const refunded = await cancelDelivery(delivery.id, reason);
      setSheet(null);
      Alert.alert(
        'Livraison annulée',
        `Vous avez été remboursé de ${Math.round(refunded)} ${CURRENCY} sur votre solde.`,
      );
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Impossible d'annuler la livraison.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReport(reason: string, details: string) {
    if (!delivery?.driver_id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await reportIssue({
        targetId: delivery.driver_id,
        jobType: 'delivery',
        jobId: delivery.id,
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
    if (!delivery?.driver_id || !driver) return;
    router.push({
      pathname: '/(client)/chat',
      params: {
        threadType: 'delivery',
        threadId: delivery.id,
        receiverId: delivery.driver_id,
        name: driver.full_name,
      },
    });
  }

  const canCancel =
    delivery?.status === 'created' || delivery?.status === 'assigned';
  const showDriverCard =
    delivery?.status === 'assigned' || delivery?.status === 'picked_up';

  if (!deliveryId) {
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
          Aucune livraison en suivi.
        </Text>
        <Button label="Retour à l'accueil" onPress={goHome} />
      </View>
    );
  }

  if (loading && !delivery) {
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
          Chargement de la livraison…
        </Text>
      </View>
    );
  }

  const refundHint = delivery?.total_price
    ? `Vous serez remboursé de ${Math.round(delivery.total_price)} ${CURRENCY} sur votre solde.`
    : 'Vous serez remboursé sur votre solde.';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {delivery && pickup && dropoff ? (
        <TrackingMap
          pickup={pickup}
          destination={dropoff}
          driverPosition={trackDriver ? driverPosition : null}
          height="fill"
          bottomPadding={theme.layout.mapPanelClearance}
          pickupLabel="Retrait"
          destinationLabel="Livraison"
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

        {delivery &&
        (delivery.status === 'created' ||
          delivery.status === 'assigned' ||
          delivery.status === 'picked_up') ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}>
              <Badge
                label={
                  delivery.delivery_type === 'livraison_express'
                    ? 'Express'
                    : 'Simple'
                }
                variant={
                  delivery.delivery_type === 'livraison_express'
                    ? 'amber'
                    : 'neutral'
                }
              />
              {delivery.package_photo_url ? (
                <Image
                  source={{ uri: delivery.package_photo_url }}
                  style={{
                    width: theme.layout.packageThumbSmall,
                    height: theme.layout.packageThumbSmall,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.border,
                  }}
                />
              ) : null}
              <Text
                numberOfLines={2}
                style={{
                  flex: 1,
                  fontFamily: theme.fonts.jakartaRegular,
                  fontSize: theme.typography.caption.fontSize,
                  color: theme.colors.textSecondary,
                }}>
                {delivery.package_description?.trim() ||
                  'Colis sans description'}
              </Text>
            </View>

            {delivery.status === 'created' ? (
              <>
                <Text
                  style={{
                    fontFamily: theme.fonts.poppinsSemiBold,
                    fontSize: theme.layout.panelTitle,
                    color: theme.colors.textPrimary,
                  }}>
                  Nous cherchons un zem pour votre colis
                </Text>
                <Text
                  style={{
                    fontFamily: theme.fonts.jakartaRegular,
                    color: theme.colors.textSecondary,
                  }}>
                  Retrait près de {delivery.pickup_label}.
                </Text>
              </>
            ) : (
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
            )}

            {showDriverCard ? (
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.border,
                }}
              />
            ) : null}

            <TripSummaryRow
              label="LIVRAISON À"
              value={delivery.dropoff_label}
              price={delivery.total_price ?? undefined}
              icon={
                <MapPin
                  size={theme.icon.size}
                  color={theme.colors.brick}
                  strokeWidth={theme.icon.strokeWidth}
                />
              }
            />

            {(delivery.status === 'assigned' ||
              delivery.status === 'picked_up') &&
            delivery.delivery_code ? (
              <MissionCodeBanner
                label="Code de livraison"
                code={delivery.delivery_code}
                hint="Communiquez ce code au destinataire ; le zem le saisira à la remise du colis."
              />
            ) : null}

            {canCancel && delivery.status === 'created' ? (
              <Button
                label="Annuler la livraison"
                variant="secondary"
                onPress={() => {
                  setActionError(null);
                  setSheet('cancel');
                }}
              />
            ) : null}

            {showDriverCard ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}>
                {canCancel ? (
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
            ) : null}
          </>
        ) : null}

        {delivery?.status === 'delivered' ? (
          <RatingBlock
            title="Comment s'est passée la livraison ?"
            onSubmit={(stars, remark) => void handleSubmitRating(stars, remark)}
            submitting={submittingRating}
            submitted={ratingSent}
            error={ratingError}
            onGoHome={goHome}
          />
        ) : null}

        {delivery?.status === 'cancelled' ? (
          <>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.panelTitle,
                color: theme.colors.textPrimary,
                textAlign: 'center',
              }}>
              Cette livraison a été annulée.
            </Text>
            <Button label="Retour à l'accueil" onPress={goHome} />
          </>
        ) : null}

        {delivery?.status === 'failed' ? (
          <>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.panelTitle,
                color: theme.colors.textPrimary,
                textAlign: 'center',
              }}>
              Livraison échouée.
            </Text>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                color: theme.colors.textSecondary,
                textAlign: 'center',
              }}>
              La livraison n’a pas pu être menée à bien.
            </Text>
            <Button label="Retour à l'accueil" onPress={goHome} />
          </>
        ) : null}

        {!delivery && error ? (
          <Button label="Réessayer" onPress={() => void refresh()} />
        ) : null}
      </View>

      <ActionSheet
        visible={sheet === 'cancel'}
        title="Annuler la livraison"
        description={refundHint}
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
