import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FareBox } from '@/components/shared/FareBox';
import { LocationRow } from '@/components/shared/LocationRow';
import { PaymentSelector } from '@/components/shared/PaymentSelector';
import { PlacePickerSheet } from '@/components/shared/PlacePickerSheet';
import { RoutePreviewMap } from '@/components/shared/RoutePreviewMap';
import { Button } from '@/components/ui/Button';
import { ACTIVE_RIDE_KEY } from '@/constants/storage';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  getCurrentPosition,
  LocationPermissionError,
  type GeoPoint,
} from '@/lib/geo/location';
import { requestFare, type FareApiResult } from '@/lib/pricing/fareApi';
import { supabase } from '@/lib/supabase';
import type { PaymentMethod } from '@/types';

type PlaceField = 'pickup' | 'destination' | null;

export default function NewRideScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const mapHeight =
    Dimensions.get('window').height * theme.layout.rideMapRatio;

  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [pickupLoading, setPickupLoading] = useState(true);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const [destination, setDestination] = useState<GeoPoint | null>(null);

  const [fare, setFare] = useState<FareApiResult | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [fareError, setFareError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [placeField, setPlaceField] = useState<PlaceField>(null);

  const loadPickup = useCallback(async () => {
    setPickupLoading(true);
    setPickupError(null);
    try {
      const point = await getCurrentPosition();
      setPickup(point);
    } catch (err) {
      const message =
        err instanceof LocationPermissionError
          ? err.message
          : 'Impossible d’obtenir votre position. Réessayez.';
      setPickupError(message);
      setPickup(null);
    } finally {
      setPickupLoading(false);
    }
  }, []);

  const loadWallet = useCallback(async () => {
    if (!profile?.id) {
      setWalletBalance(null);
      return;
    }
    setWalletLoading(true);
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', profile.id)
      .maybeSingle();
    if (error || !data) {
      setWalletBalance(0);
    } else {
      setWalletBalance(Number(data.balance) || 0);
    }
    setWalletLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    void loadPickup();
  }, [loadPickup]);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet]),
  );

  useEffect(() => {
    if (!pickup || !destination) {
      setFare(null);
      setFareError(null);
      return;
    }

    let cancelled = false;
    setFareLoading(true);
    setFareError(null);

    requestFare({
      profile: 'course',
      pickup: { lat: pickup.lat, lng: pickup.lng },
      destination: { lat: destination.lat, lng: destination.lng },
    })
      .then((result) => {
        if (!cancelled) setFare(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFare(null);
          setFareError(
            err instanceof Error
              ? err.message
              : 'Impossible de calculer le prix.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setFareLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, destination]);

  const insufficientWallet =
    paymentMethod === 'wallet' &&
    fare != null &&
    walletBalance != null &&
    walletBalance < fare.totalPrice;

  const canConfirm =
    !!profile?.id &&
    !!pickup &&
    !!destination &&
    !!fare &&
    !fareLoading &&
    !confirming &&
    !insufficientWallet &&
    !(paymentMethod === 'wallet' && walletLoading);

  async function handleConfirm() {
    if (!canConfirm || !profile || !pickup || !destination || !fare) return;

    setConfirmError(null);
    setConfirming(true);

    const { data, error } = await supabase
      .from('rides')
      .insert({
        client_id: profile.id,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_label: pickup.label,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_label: destination.label,
        status: 'searching',
        payment_method: paymentMethod,
        driver_payout: fare.driverPayout,
        zemi_commission: fare.zemiCommission,
        total_price: fare.totalPrice,
      })
      .select('id')
      .single();

    setConfirming(false);

    if (error || !data?.id) {
      setConfirmError('Impossible de créer la course. Réessayez.');
      return;
    }

    await AsyncStorage.setItem(ACTIVE_RIDE_KEY, data.id);

    router.replace({
      pathname: '/(client)/ride-status',
      params: { rideId: data.id },
    });
  }

  const pickupLabel = pickupLoading
    ? 'Localisation en cours…'
    : pickup?.label;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ height: mapHeight }}>
        <RoutePreviewMap
          pickup={pickup ?? undefined}
          destination={destination ?? undefined}
          height={mapHeight}
        />
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
            opacity: pressed ? 0.85 : 1,
            ...theme.shadow.soft,
          })}>
          <ArrowLeft
            size={theme.icon.size}
            strokeWidth={theme.icon.strokeWidth}
            color={theme.colors.green900}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, marginTop: -theme.spacing.xl }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={theme.spacing.md}>
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.layout.panelTopRadius,
            borderTopRightRadius: theme.layout.panelTopRadius,
            paddingTop: theme.spacing.lg,
            shadowColor: theme.colors.black,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: insets.bottom + theme.spacing.xl,
              gap: theme.spacing.md,
            }}
            showsVerticalScrollIndicator={false}>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.panelTitle,
                lineHeight: theme.layout.panelTitle + theme.spacing.sm,
                color: theme.colors.textPrimary,
              }}>
              Votre trajet
            </Text>

            <LocationRow
              icon={
                <Navigation
                  size={theme.icon.size}
                  color={theme.colors.green500}
                  strokeWidth={theme.icon.strokeWidth}
                />
              }
              iconColor={theme.colors.green500}
              placeholder="Point de départ"
              value={pickupLabel}
              onPress={() => setPlaceField('pickup')}
            />

            <LocationRow
              icon={
                <MapPin
                  size={theme.icon.size}
                  color={theme.colors.brick}
                  strokeWidth={theme.icon.strokeWidth}
                />
              }
              iconColor={theme.colors.brick}
              placeholder="Où allez-vous ?"
              value={destination?.label}
              onPress={() => setPlaceField('destination')}
            />

            {pickupError ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  color: theme.colors.brick,
                }}>
                {pickupError}
              </Text>
            ) : null}

            <FareBox
              price={fare?.totalPrice}
              durationMin={fare?.durationMin}
              distanceKm={fare?.distanceKm}
              loading={fareLoading}
            />
            {fareError ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  color: theme.colors.brick,
                }}>
                {fareError}
              </Text>
            ) : null}

            <PaymentSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              balance={walletBalance ?? undefined}
              price={fare?.totalPrice}
            />

            {confirmError ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  color: theme.colors.brick,
                }}>
                {confirmError}
              </Text>
            ) : null}

            <View style={{ marginTop: theme.spacing.sm }}>
              <Button
                label="Confirmer la course"
                variant="amber"
                loading={confirming}
                disabled={!canConfirm}
                onPress={() => void handleConfirm()}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <PlacePickerSheet
        visible={placeField === 'pickup'}
        title="Point de départ"
        initialPosition={pickup ?? undefined}
        onClose={() => setPlaceField(null)}
        onSelect={(place) => {
          setPickupError(null);
          setPickup(place);
        }}
      />
      <PlacePickerSheet
        visible={placeField === 'destination'}
        title="Où allez-vous ?"
        initialPosition={destination ?? pickup ?? undefined}
        onClose={() => setPlaceField(null)}
        onSelect={(place) => {
          setDestination(place);
        }}
      />
    </View>
  );
}
