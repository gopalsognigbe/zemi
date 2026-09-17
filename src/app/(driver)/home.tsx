import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Bell, Clock, Power } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveMissionPanel } from '@/components/driver/ActiveMissionPanel';
import { CodeEntryModal } from '@/components/driver/CodeEntryModal';
import { MissionCard } from '@/components/driver/MissionCard';
import { OnlineToggleCard } from '@/components/driver/OnlineToggleCard';
import { StatsRow } from '@/components/driver/StatsRow';
import { Button } from '@/components/ui/Button';
import { CURRENCY } from '@/constants/config';
import { POPULAR_PLACES } from '@/constants/places';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useDriverStats } from '@/hooks/useDriverStats';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { callNumber } from '@/lib/contact/contact';
import {
  claimDelivery,
  completeDeliveryWithCode,
  fetchActiveDelivery,
  fetchCreatedDeliveries,
  markDeliveryPickedUp,
  type DriverDeliveryRow,
} from '@/lib/driver/deliveries';
import {
  claimRide,
  completeRide,
  fetchActiveRide,
  fetchSearchingRides,
  startRideWithCode,
  type DriverRideRow,
} from '@/lib/driver/rides';
import {
  fetchDriverRow,
  goOffline,
  goOnline,
  goOnlineAt,
} from '@/lib/driver/status';
import { useLocationBroadcast } from '@/lib/driver/useLocationBroadcast';
import { estimateEtaMinutes } from '@/lib/geo/eta';
import { haversineKm } from '@/lib/geo/distance';
import { supabase } from '@/lib/supabase';

interface SearchingRideCard extends DriverRideRow {
  distanceKm: number;
}

interface AvailableDeliveryCard extends DriverDeliveryRow {
  distanceKm: number;
}

type MixedMission =
  | { kind: 'ride'; item: SearchingRideCard }
  | { kind: 'delivery'; item: AvailableDeliveryCard };

interface ClientInfo {
  id: string;
  fullName: string;
  phone?: string | null;
}

function greetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour,';
  if (hour < 18) return 'Bon après-midi,';
  return 'Bonsoir,';
}

function initialsFromName(fullName?: string): string {
  if (!fullName?.trim()) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last =
    parts.length > 1
      ? (parts[parts.length - 1]?.[0] ?? '')
      : (parts[0]?.[1] ?? '');
  return `${first}${last}`.toUpperCase();
}

export default function DriverHomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { count: unreadCount } = useUnreadCount();
  const {
    earningsToday,
    jobsToday,
    loading: statsLoading,
    refresh: refreshStats,
  } = useDriverStats();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  const [activeRide, setActiveRide] = useState<DriverRideRow | null>(null);
  const [activeDelivery, setActiveDelivery] =
    useState<DriverDeliveryRow | null>(null);

  const [searching, setSearching] = useState<SearchingRideCard[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<
    AvailableDeliveryCard[]
  >([]);

  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
  const [acceptingDeliveryId, setAcceptingDeliveryId] = useState<string | null>(
    null,
  );
  const [updatingRide, setUpdatingRide] = useState(false);
  const [updatingDelivery, setUpdatingDelivery] = useState(false);

  const [codeModal, setCodeModal] = useState<'start_ride' | 'complete_delivery' | null>(
    null,
  );
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const hasActiveMission = !!activeRide || !!activeDelivery;
  useLocationBroadcast(isOnline || hasActiveMission);

  const loadClient = useCallback(async (userId: string) => {
    setClientLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setClient({
        id: data.id as string,
        fullName: String(data.full_name ?? 'Client'),
        phone: (data.phone as string | null) ?? null,
      });
    } else {
      setClient({ id: userId, fullName: 'Client ZEMi', phone: null });
    }
    setClientLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    setError(null);

    const driver = await fetchDriverRow(profile.id);
    if (driver.error) {
      setError(driver.error);
      setLoading(false);
      return;
    }

    setIsOnline(driver.isOnline);
    setMyLat(driver.lat);
    setMyLng(driver.lng);

    const activeDel = await fetchActiveDelivery(profile.id);
    if (activeDel.error) {
      setError(activeDel.error);
      setLoading(false);
      return;
    }

    if (activeDel.delivery) {
      setActiveDelivery(activeDel.delivery);
      setActiveRide(null);
      setSearching([]);
      setAvailableDeliveries([]);
      void loadClient(activeDel.delivery.sender_id);
      setLoading(false);
      return;
    }

    setActiveDelivery(null);

    const active = await fetchActiveRide(profile.id);
    if (active.error) {
      setError(active.error);
      setLoading(false);
      return;
    }

    if (active.ride) {
      setActiveRide(active.ride);
      setSearching([]);
      setAvailableDeliveries([]);
      void loadClient(active.ride.client_id);
      setLoading(false);
      return;
    }

    setActiveRide(null);
    setClient(null);

    if (driver.isOnline && driver.lat != null && driver.lng != null) {
      const [list, deliveriesList] = await Promise.all([
        fetchSearchingRides(),
        fetchCreatedDeliveries(),
      ]);

      if (list.error) {
        setSearching([]);
      } else {
        const withDistance: SearchingRideCard[] = list.rides
          .map((ride) => ({
            ...ride,
            distanceKm: haversineKm(
              { lat: driver.lat!, lng: driver.lng! },
              { lat: Number(ride.pickup_lat), lng: Number(ride.pickup_lng) },
            ),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm);
        setSearching(withDistance);
      }

      if (deliveriesList.error) {
        setAvailableDeliveries([]);
      } else {
        const withDistance: AvailableDeliveryCard[] =
          deliveriesList.deliveries
            .map((delivery) => ({
              ...delivery,
              distanceKm: haversineKm(
                { lat: driver.lat!, lng: driver.lng! },
                {
                  lat: Number(delivery.pickup_lat),
                  lng: Number(delivery.pickup_lng),
                },
              ),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
        setAvailableDeliveries(withDistance);
      }

      const loadError = list.error ?? deliveriesList.error;
      if (loadError) setError(loadError);
    } else {
      setSearching([]);
      setAvailableDeliveries([]);
    }

    setLoading(false);
  }, [profile?.id, loadClient]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshStats();
    }, [refresh, refreshStats]),
  );

  const mixedMissions = useMemo((): MixedMission[] => {
    const rides: MixedMission[] = searching.map((item) => ({
      kind: 'ride',
      item,
    }));
    const deliveries: MixedMission[] = availableDeliveries.map((item) => ({
      kind: 'delivery',
      item,
    }));
    return [...rides, ...deliveries].sort(
      (a, b) => a.item.distanceKm - b.item.distanceKm,
    );
  }, [searching, availableDeliveries]);

  async function handleToggleOnline() {
    if (!profile?.id || toggling) return;

    if (isOnline) {
      setToggling(true);
      setError(null);
      setInfo(null);
      const result = await goOffline(profile.id);
      setToggling(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsOnline(false);
      setSearching([]);
      setAvailableDeliveries([]);
      setShowPlacePicker(false);
      setInfo(null);
      await refresh();
      return;
    }

    setToggling(true);
    setError(null);
    setInfo(null);
    setShowPlacePicker(false);

    const result = await goOnline(profile.id);
    setToggling(false);

    if (result.error || !result.position) {
      setShowPlacePicker(true);
      setError(null);
      setInfo(
        'GPS indisponible. Choisissez un lieu pour passer en ligne.',
      );
      return;
    }

    setIsOnline(true);
    setMyLat(result.position.lat);
    setMyLng(result.position.lng);
    await refresh();
  }

  async function handleManualOnline(place: {
    name: string;
    lat: number;
    lng: number;
  }) {
    if (!profile?.id || toggling) return;

    setToggling(true);
    setError(null);
    setInfo(null);

    const result = await goOnlineAt(profile.id, {
      lat: place.lat,
      lng: place.lng,
      label: place.name,
    });
    setToggling(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsOnline(true);
    setMyLat(place.lat);
    setMyLng(place.lng);
    setShowPlacePicker(false);
    setInfo(null);
    await refresh();
  }

  async function handleAccept(rideId: string) {
    if (!profile?.id) return;

    setAcceptingRideId(rideId);
    setError(null);
    setInfo(null);

    const result = await claimRide(rideId, profile.id);
    setAcceptingRideId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.alreadyTaken) {
      setInfo('Cette mission vient d’être prise.');
      await refresh();
      return;
    }

    setActiveRide(result.ride);
    setActiveDelivery(null);
    setSearching([]);
    setAvailableDeliveries([]);
    if (result.ride) void loadClient(result.ride.client_id);
  }

  async function handleAcceptDelivery(deliveryId: string) {
    if (!profile?.id) return;

    setAcceptingDeliveryId(deliveryId);
    setError(null);
    setInfo(null);

    const result = await claimDelivery(deliveryId, profile.id);
    setAcceptingDeliveryId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.alreadyTaken) {
      setInfo('Cette mission vient d’être prise.');
      await refresh();
      return;
    }

    setActiveDelivery(result.delivery);
    setActiveRide(null);
    setSearching([]);
    setAvailableDeliveries([]);
    if (result.delivery) void loadClient(result.delivery.sender_id);
  }

  async function handleStart() {
    setCodeError(null);
    setCodeModal('start_ride');
  }

  async function submitStartCode(code: string) {
    if (!activeRide) return;
    setCodeLoading(true);
    setCodeError(null);
    const result = await startRideWithCode(activeRide.id, code);
    setCodeLoading(false);

    if (result.wrongCode) {
      setCodeError(
        result.error ?? 'Code incorrect. Vérifiez auprès du passager.',
      );
      return;
    }
    if (result.error) {
      setCodeError(result.error);
      return;
    }

    setCodeModal(null);
    setActiveRide({ ...activeRide, status: 'in_progress' });
    await refresh();
  }

  async function handleComplete() {
    if (!activeRide) return;
    const gain = activeRide.driver_payout ?? 0;
    const paidByWallet = activeRide.payment_method === 'wallet';
    setUpdatingRide(true);
    setError(null);
    const result = await completeRide(activeRide.id);
    setUpdatingRide(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setActiveRide(null);
    if (result.settled === false) {
      setInfo(
        'Course terminée (sans règlement portefeuille — exécutez la migration 0011 dans Supabase).',
      );
    } else {
      setInfo(
        paidByWallet
          ? `Course terminée — ${gain} ${CURRENCY} crédités`
          : 'Course terminée — paiement en espèces',
      );
    }
    await refresh();
    await refreshStats();
  }

  async function handlePickedUp() {
    if (!activeDelivery) return;
    setUpdatingDelivery(true);
    setError(null);
    const result = await markDeliveryPickedUp(activeDelivery.id);
    setUpdatingDelivery(false);
    if (result.error || !result.delivery) {
      setError(
        result.error ?? 'Impossible de marquer le colis comme récupéré.',
      );
      return;
    }
    setActiveDelivery(result.delivery);
  }

  async function handleDeliveryComplete() {
    setCodeError(null);
    setCodeModal('complete_delivery');
  }

  async function submitDeliveryCode(code: string) {
    if (!activeDelivery) return;
    const gain = activeDelivery.driver_payout ?? 0;
    setCodeLoading(true);
    setCodeError(null);
    const result = await completeDeliveryWithCode(activeDelivery.id, code);
    setCodeLoading(false);

    if (result.wrongCode) {
      setCodeError(
        result.error ?? 'Code incorrect. Vérifiez auprès du destinataire.',
      );
      return;
    }
    if (result.error) {
      setCodeError(result.error);
      return;
    }

    setCodeModal(null);
    setActiveDelivery(null);
    setInfo(
      `Livraison confirmée — ${gain} ${CURRENCY} ajoutés à vos gains.`,
    );
    await refresh();
    await refreshStats();
  }

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    await refreshStats();
    setRefreshing(false);
  }

  function openChat(threadType: 'ride' | 'delivery', threadId: string) {
    if (!client) return;
    router.push({
      pathname: '/(driver)/chat',
      params: {
        threadType,
        threadId,
        receiverId: client.id,
        name: client.fullName,
      },
    });
  }

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.bg,
        }}>
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            color: theme.colors.textSecondary,
          }}>
          Chargement du profil…
        </Text>
      </View>
    );
  }

  const displayName = profile.fullName?.trim() || 'Zem';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.colors.green700}
          colors={[theme.colors.green700]}
        />
      }>
      {/* En-tête */}
      <View
        style={{
          backgroundColor: theme.colors.green700,
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: theme.spacing.xxl,
          paddingHorizontal: theme.spacing.lg,
          borderBottomLeftRadius: theme.radius.xxl,
          borderBottomRightRadius: theme.radius.xxl,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: theme.layout.homeAvatar,
              height: theme.layout.homeAvatar,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.green500,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.md,
            }}>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.typography.label.fontSize,
                color: theme.colors.white,
              }}>
              {initialsFromName(profile.fullName)}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                fontSize: theme.typography.caption.fontSize,
                color: theme.colors.white,
                opacity: theme.layout.homeGreetingSubOpacity,
              }}>
              {greetingPrefix()}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.homeGreeting,
                color: theme.colors.white,
              }}>
              {displayName}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            style={({ pressed }) => ({
              width: theme.layout.touchMin,
              height: theme.layout.touchMin,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}>
            <Bell
              size={theme.icon.size}
              color={theme.colors.white}
              strokeWidth={theme.icon.strokeWidth}
            />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: theme.spacing.sm,
                  right: theme.spacing.sm,
                  width: theme.spacing.sm + 2,
                  height: theme.spacing.sm + 2,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.amber500,
                  borderWidth: 1.5,
                  borderColor: theme.colors.green700,
                }}
              />
            ) : null}
          </Pressable>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          marginTop: -theme.spacing.lg,
          gap: theme.spacing.lg,
        }}>
        {error ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaMedium,
              color: theme.colors.brick,
              fontSize: theme.typography.body.fontSize,
            }}>
            {error}
          </Text>
        ) : null}
        {info ? (
          <Text
            style={{
              fontFamily: theme.fonts.jakartaMedium,
              color: theme.colors.green700,
              fontSize: theme.typography.body.fontSize,
            }}>
            {info}
          </Text>
        ) : null}

        {/* Mission active uniquement */}
        {activeDelivery ? (
          <ActiveMissionPanel
            kind="delivery"
            express={activeDelivery.delivery_type === 'livraison_express'}
            payout={activeDelivery.driver_payout ?? 0}
            fromLabel={activeDelivery.pickup_label}
            toLabel={activeDelivery.dropoff_label}
            client={client}
            clientLoading={clientLoading}
            packagePhotoUrl={activeDelivery.package_photo_url}
            packageDescription={activeDelivery.package_description}
            recipientPhone={activeDelivery.recipient_phone}
            primaryLabel={
              activeDelivery.status === 'assigned'
                ? 'Colis récupéré'
                : 'Livraison effectuée'
            }
            busy={updatingDelivery || codeLoading}
            requiresConfirm={false}
            onPrimaryAction={() => {
              if (activeDelivery.status === 'assigned') {
                void handlePickedUp();
              } else {
                void handleDeliveryComplete();
              }
            }}
            onMessage={() => openChat('delivery', activeDelivery.id)}
            onCall={
              client?.phone
                ? () => void callNumber(client.phone!)
                : undefined
            }
          />
        ) : activeRide ? (
          <ActiveMissionPanel
            kind="ride"
            payout={activeRide.driver_payout ?? 0}
            fromLabel={activeRide.pickup_label}
            toLabel={activeRide.destination_label}
            client={client}
            clientLoading={clientLoading}
            primaryLabel={
              activeRide.status === 'assigned'
                ? 'Démarrer la course'
                : 'Terminer la course'
            }
            busy={updatingRide || codeLoading}
            requiresConfirm={activeRide.status === 'in_progress'}
            onPrimaryAction={() => {
              if (activeRide.status === 'assigned') {
                void handleStart();
              } else {
                void handleComplete();
              }
            }}
            onMessage={() => openChat('ride', activeRide.id)}
            onCall={
              client?.phone
                ? () => void callNumber(client.phone!)
                : undefined
            }
          />
        ) : (
          <>
            <OnlineToggleCard
              isOnline={isOnline}
              loading={toggling}
              onToggle={() => void handleToggleOnline()}
            />

            <StatsRow
              earnings={earningsToday}
              jobs={jobsToday}
              loading={statsLoading}
            />

            {showPlacePicker && !isOnline ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Text
                  style={{
                    fontFamily: theme.fonts.jakartaMedium,
                    fontSize: theme.typography.caption.fontSize,
                    color: theme.colors.textPrimary,
                  }}>
                  Choisissez un lieu pour passer en ligne :
                </Text>
                {POPULAR_PLACES.map((place) => (
                  <Button
                    key={place.name}
                    label={place.name}
                    variant="secondary"
                    loading={toggling}
                    disabled={toggling}
                    onPress={() => void handleManualOnline(place)}
                  />
                ))}
              </View>
            ) : null}

            {!isOnline ? (
              <View
                style={{
                  alignItems: 'center',
                  paddingVertical: theme.spacing.xxl,
                  gap: theme.spacing.md,
                }}>
                <Power
                  size={theme.layout.driverEmptyIcon}
                  color={theme.colors.textSecondary}
                  strokeWidth={theme.icon.strokeWidth}
                />
                <Text
                  style={{
                    fontFamily: theme.fonts.poppinsSemiBold,
                    fontSize: theme.layout.driverMissionTitle,
                    color: theme.colors.textPrimary,
                    textAlign: 'center',
                  }}>
                  Vous êtes hors ligne
                </Text>
                <Text
                  style={{
                    fontFamily: theme.fonts.jakartaRegular,
                    fontSize: theme.typography.body.fontSize,
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                    paddingHorizontal: theme.spacing.lg,
                  }}>
                  Activez le bouton ci-dessus pour recevoir des missions.
                </Text>
              </View>
            ) : loading ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing.xl,
                  gap: theme.spacing.sm,
                }}>
                <ActivityIndicator color={theme.colors.green700} />
                <Text
                  style={{
                    fontFamily: theme.fonts.jakartaRegular,
                    color: theme.colors.textSecondary,
                  }}>
                  Chargement des missions…
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={{
                    fontFamily: theme.fonts.poppinsSemiBold,
                    fontSize: theme.layout.driverMissionTitle,
                    color: theme.colors.textPrimary,
                  }}>
                  Missions disponibles
                </Text>

                {mixedMissions.length === 0 ? (
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: theme.spacing.xxl,
                      gap: theme.spacing.md,
                    }}>
                    <Clock
                      size={theme.layout.driverEmptyIcon}
                      color={theme.colors.textSecondary}
                      strokeWidth={theme.icon.strokeWidth}
                    />
                    <Text
                      style={{
                        fontFamily: theme.fonts.poppinsSemiBold,
                        fontSize: theme.layout.driverMissionTitle,
                        color: theme.colors.textPrimary,
                        textAlign: 'center',
                      }}>
                      Aucune mission pour l&apos;instant
                    </Text>
                    <Text
                      style={{
                        fontFamily: theme.fonts.jakartaRegular,
                        fontSize: theme.typography.body.fontSize,
                        color: theme.colors.textSecondary,
                        textAlign: 'center',
                      }}>
                      Restez en ligne, une demande va arriver.
                    </Text>
                  </View>
                ) : (
                  mixedMissions.map((mission) => {
                    const from =
                      myLat != null && myLng != null
                        ? { lat: myLat, lng: myLng }
                        : null;
                    const pickup =
                      mission.kind === 'ride'
                        ? {
                            lat: Number(mission.item.pickup_lat),
                            lng: Number(mission.item.pickup_lng),
                          }
                        : {
                            lat: Number(mission.item.pickup_lat),
                            lng: Number(mission.item.pickup_lng),
                          };
                    const etaMin = from
                      ? estimateEtaMinutes(from, pickup)
                      : 1;

                    if (mission.kind === 'ride') {
                      const ride = mission.item;
                      return (
                        <MissionCard
                          key={`ride-${ride.id}`}
                          kind="ride"
                          payout={ride.driver_payout ?? 0}
                          fromLabel={ride.pickup_label}
                          toLabel={ride.destination_label}
                          distanceKm={ride.distanceKm}
                          etaMin={etaMin}
                          accepting={acceptingRideId === ride.id}
                          disabled={
                            (acceptingRideId != null &&
                              acceptingRideId !== ride.id) ||
                            acceptingDeliveryId != null
                          }
                          onAccept={() => void handleAccept(ride.id)}
                        />
                      );
                    }

                    const delivery = mission.item;
                    return (
                      <MissionCard
                        key={`delivery-${delivery.id}`}
                        kind="delivery"
                        payout={delivery.driver_payout ?? 0}
                        fromLabel={delivery.pickup_label}
                        toLabel={delivery.dropoff_label}
                        distanceKm={delivery.distanceKm}
                        etaMin={etaMin}
                        expressBadge={
                          delivery.delivery_type === 'livraison_express'
                        }
                        accepting={acceptingDeliveryId === delivery.id}
                        disabled={
                          (acceptingDeliveryId != null &&
                            acceptingDeliveryId !== delivery.id) ||
                          acceptingRideId != null
                        }
                        onAccept={() =>
                          void handleAcceptDelivery(delivery.id)
                        }
                      />
                    );
                  })
                )}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>

      <CodeEntryModal
        visible={codeModal === 'start_ride'}
        title="Code de départ"
        subtitle="Demandez le code à votre passager."
        confirmLabel="Démarrer"
        loading={codeLoading}
        error={codeModal === 'start_ride' ? codeError : null}
        onSubmit={(code) => void submitStartCode(code)}
        onClose={() => {
          if (codeLoading) return;
          setCodeModal(null);
          setCodeError(null);
        }}
      />

      <CodeEntryModal
        visible={codeModal === 'complete_delivery'}
        title="Code de livraison"
        subtitle="Demandez le code au destinataire."
        confirmLabel="Confirmer la livraison"
        loading={codeLoading}
        error={codeModal === 'complete_delivery' ? codeError : null}
        onSubmit={(code) => void submitDeliveryCode(code)}
        onClose={() => {
          if (codeLoading) return;
          setCodeModal(null);
          setCodeError(null);
        }}
      />
    </View>
  );
}
