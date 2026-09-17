import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Package,
  Phone,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FareBox } from '@/components/shared/FareBox';
import { LocationRow } from '@/components/shared/LocationRow';
import { PaymentSelector } from '@/components/shared/PaymentSelector';
import { PlacePickerSheet } from '@/components/shared/PlacePickerSheet';
import { RoutePreviewMap } from '@/components/shared/RoutePreviewMap';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  createDelivery,
  InsufficientBalanceError,
  type DeliveryType,
} from '@/lib/delivery/deliveryApi';
import {
  getCurrentPosition,
  LocationPermissionError,
  type GeoPoint,
} from '@/lib/geo/location';
import { requestFare, type FareApiResult } from '@/lib/pricing/fareApi';
import { uploadPackagePhoto } from '@/lib/storage/uploadPhoto';
import { getWallet } from '@/lib/wallet/walletApi';

type PlaceField = 'pickup' | 'dropoff' | null;

export default function NewDeliveryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const mapHeight =
    Dimensions.get('window').height * theme.layout.deliveryMapRatio;

  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);

  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [pickupLoading, setPickupLoading] = useState(true);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);

  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [fare, setFare] = useState<FareApiResult | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [fareError, setFareError] = useState<string | null>(null);

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const walletBalance = await getWallet();
      setBalance(walletBalance);
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPickup();
  }, [loadPickup]);

  useFocusEffect(
    useCallback(() => {
      void loadBalance();
    }, [loadBalance]),
  );

  useEffect(() => {
    if (!deliveryType || !pickup || !dropoff) {
      setFare(null);
      setFareError(null);
      return;
    }

    let cancelled = false;
    setFareLoading(true);
    setFareError(null);

    requestFare({
      profile: deliveryType,
      pickup: { lat: pickup.lat, lng: pickup.lng },
      destination: { lat: dropoff.lat, lng: dropoff.lng },
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
  }, [deliveryType, pickup, dropoff]);

  async function pickAndUploadPhoto(fromCamera: boolean) {
    if (!profile?.id) return;

    setPhotoError(null);

    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setPhotoError('Permission refusée pour accéder à la photo.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    const uri = result.assets[0].uri;
    setLocalPhotoUri(uri);
    setPhotoUrl(null);
    setPhotoUploading(true);

    try {
      const url = await uploadPackagePhoto(uri, profile.id);
      setPhotoUrl(url);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Échec de l’envoi de la photo.',
      );
      setLocalPhotoUri(null);
    } finally {
      setPhotoUploading(false);
    }
  }

  function useTestPhoto() {
    setPhotoError(null);
    setLocalPhotoUri(null);
    setPhotoUrl('https://placehold.co/600x400/png?text=Colis+ZEMi');
  }

  function openPhotoOptions() {
    Alert.alert('Photo du colis', 'Choisissez une source', [
      {
        text: 'Galerie',
        onPress: () => void pickAndUploadPhoto(false),
      },
      {
        text: 'Appareil photo',
        onPress: () => void pickAndUploadPhoto(true),
      },
      {
        text: 'Photo de test',
        onPress: useTestPhoto,
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function clearPhoto() {
    setLocalPhotoUri(null);
    setPhotoUrl(null);
    setPhotoError(null);
  }

  const insufficient =
    fare != null && balance != null && balance < fare.totalPrice;

  const missingHint = useMemo(() => {
    if (!deliveryType) return 'Choisissez le type de livraison.';
    if (!pickup) return 'Indiquez le point de retrait.';
    if (!dropoff) return 'Indiquez la destination.';
    if (recipientPhone.replace(/\D/g, '').length < 8) {
      return 'Saisissez le téléphone du destinataire.';
    }
    if (!packageDescription.trim()) return 'Décrivez le colis.';
    if (photoUploading) return 'Envoi de la photo en cours…';
    if (!photoUrl) {
      return 'Ajoutez une photo du colis (obligatoire).';
    }
    if (fareLoading) return 'Calcul du prix…';
    if (!fare) return 'Le prix n’est pas encore disponible.';
    if (insufficient) return 'Solde insuffisant — rechargez puis revenez ici.';
    return null;
  }, [
    deliveryType,
    pickup,
    dropoff,
    recipientPhone,
    packageDescription,
    photoUploading,
    photoUrl,
    fareLoading,
    fare,
    insufficient,
  ]);

  const canSubmit = !missingHint && !submitting && !balanceLoading;

  async function handleSubmit() {
    if (!profile?.id) {
      setSubmitError('Vous devez être connecté.');
      return;
    }

    if (missingHint) {
      setSubmitError(missingHint);
      return;
    }

    if (!deliveryType || !pickup || !dropoff || !fare || !photoUrl) {
      setSubmitError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const freshBalance = await getWallet();
      setBalance(freshBalance);
      if (freshBalance < fare.totalPrice) {
        throw new InsufficientBalanceError('Solde insuffisant');
      }

      const result = await createDelivery({
        deliveryType,
        pickup: { lat: pickup.lat, lng: pickup.lng },
        pickupLabel: pickup.label,
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        dropoffLabel: dropoff.label,
        recipientPhone: recipientPhone.trim(),
        packageDescription: packageDescription.trim(),
        packagePhotoUrl: photoUrl,
      });
      setBalance(freshBalance - fare.totalPrice);
      router.replace({
        pathname: '/(client)/delivery-status',
        params: { deliveryId: result.deliveryId },
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        setSubmitError('Solde insuffisant, rechargez votre compte.');
        void loadBalance();
      } else {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Impossible de créer la livraison. Réessayez.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function TypeCard({
    type,
    title,
    subtitle,
    icon: Icon,
  }: {
    type: DeliveryType;
    title: string;
    subtitle: string;
    icon: typeof Package;
  }) {
    const selected = deliveryType === type;
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setDeliveryType(type)}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: theme.layout.touchMin + theme.spacing.xl,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: selected ? theme.colors.green700 : theme.colors.border,
          backgroundColor: selected
            ? theme.colors.green700
            : theme.colors.surface,
          padding: theme.spacing.md,
          opacity: pressed ? 0.92 : 1,
        })}>
        <Icon
          size={theme.icon.size}
          strokeWidth={theme.icon.strokeWidth}
          color={selected ? theme.colors.white : theme.colors.amber500}
        />
        <Text
          style={{
            marginTop: theme.spacing.sm,
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.typography.label.fontSize,
            color: selected ? theme.colors.white : theme.colors.textPrimary,
          }}>
          {title}
        </Text>
        <Text
          style={{
            marginTop: theme.spacing.xs,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.layout.homeActionSubtitle,
            color: selected
              ? theme.colors.white
              : theme.colors.textSecondary,
            opacity: selected ? 0.85 : 1,
          }}>
          {subtitle}
        </Text>
      </Pressable>
    );
  }

  const pickupLabel = pickupLoading
    ? 'Localisation en cours…'
    : pickup?.label;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ height: mapHeight }}>
        <RoutePreviewMap
          pickup={pickup ?? undefined}
          destination={dropoff ?? undefined}
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
              Envoyer un colis
            </Text>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <TypeCard
                type="livraison_simple"
                title="Simple"
                subtitle="Économique"
                icon={Package}
              />
              <TypeCard
                type="livraison_express"
                title="Express"
                subtitle="Zem dédié, plus rapide"
                icon={Navigation}
              />
            </View>

            <LocationRow
              icon={
                <Package
                  size={theme.icon.size}
                  color={theme.colors.green500}
                  strokeWidth={theme.icon.strokeWidth}
                />
              }
              iconColor={theme.colors.green500}
              placeholder="Point de retrait"
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
              placeholder="Adresse de livraison"
              value={dropoff?.label}
              onPress={() => setPlaceField('dropoff')}
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

            <Input
              label="Numéro du destinataire"
              icon={Phone}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              placeholder="Ex. 97 00 00 00"
              keyboardType="phone-pad"
            />

            <Input
              label="Description du colis"
              value={packageDescription}
              onChangeText={setPackageDescription}
              placeholder="Ex. Petit colis fragile"
              multiline
            />

            {localPhotoUri || photoUrl ? (
              <View style={{ width: theme.layout.photoThumb }}>
                <Image
                  source={{ uri: localPhotoUri ?? photoUrl! }}
                  style={{
                    width: theme.layout.photoThumb,
                    height: theme.layout.photoThumb,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.border,
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer la photo"
                  onPress={clearPhoto}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    top: -theme.spacing.xs,
                    right: -theme.spacing.xs,
                    width: theme.spacing.xl,
                    height: theme.spacing.xl,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.brick,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}>
                  <X
                    size={theme.spacing.md}
                    color={theme.colors.white}
                    strokeWidth={theme.icon.strokeWidth}
                  />
                </Pressable>
                {photoUploading ? (
                  <Text
                    style={{
                      marginTop: theme.spacing.sm,
                      fontFamily: theme.fonts.jakartaRegular,
                      color: theme.colors.textSecondary,
                    }}>
                    Envoi de la photo…
                  </Text>
                ) : photoUrl ? (
                  <Text
                    style={{
                      marginTop: theme.spacing.sm,
                      fontFamily: theme.fonts.jakartaMedium,
                      color: theme.colors.green700,
                    }}>
                    Photo ajoutée
                  </Text>
                ) : null}
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={openPhotoOptions}
                style={({ pressed }) => ({
                  minHeight: theme.layout.photoThumb + theme.spacing.xl,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing.lg,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <Package
                  size={theme.icon.size + 4}
                  color={theme.colors.amber500}
                  strokeWidth={theme.icon.strokeWidth}
                />
                <Text
                  style={{
                    marginTop: theme.spacing.sm,
                    fontFamily: theme.fonts.poppinsSemiBold,
                    fontSize: theme.typography.label.fontSize,
                    color: theme.colors.textPrimary,
                    textAlign: 'center',
                  }}>
                  Ajouter une photo du colis
                </Text>
                <Text
                  style={{
                    marginTop: theme.spacing.xs,
                    fontFamily: theme.fonts.jakartaRegular,
                    fontSize: theme.typography.caption.fontSize,
                    color: theme.colors.textSecondary,
                  }}>
                  obligatoire
                </Text>
              </Pressable>
            )}
            {photoError ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  color: theme.colors.brick,
                }}>
                {photoError}
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
              value="wallet"
              onChange={() => undefined}
              balance={balance ?? undefined}
              price={fare?.totalPrice}
              walletOnly
            />

            {submitError ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  color: theme.colors.brick,
                }}>
                {submitError}
              </Text>
            ) : missingHint ? (
              <Text
                style={{
                  fontFamily: theme.fonts.jakartaMedium,
                  color: theme.colors.textSecondary,
                }}>
                {missingHint}
              </Text>
            ) : null}

            <View style={{ marginTop: theme.spacing.sm }}>
              <Button
                label="Envoyer le colis"
                variant="amber"
                loading={submitting}
                disabled={!canSubmit}
                onPress={() => void handleSubmit()}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <PlacePickerSheet
        visible={placeField === 'pickup'}
        title="Point de retrait"
        initialPosition={pickup ?? undefined}
        onClose={() => setPlaceField(null)}
        onSelect={(place) => {
          setPickupError(null);
          setPickup(place);
        }}
      />
      <PlacePickerSheet
        visible={placeField === 'dropoff'}
        title="Adresse de livraison"
        initialPosition={dropoff ?? pickup ?? undefined}
        onClose={() => setPlaceField(null)}
        onSelect={(place) => {
          setDropoff(place);
        }}
      />
    </View>
  );
}
