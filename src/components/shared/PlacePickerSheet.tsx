import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Navigation, X } from 'lucide-react-native';

import { MapPointPicker } from '@/components/shared/MapPointPicker';
import { COTONOU_CENTER } from '@/components/shared/mapShared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { POPULAR_PLACES } from '@/constants/places';
import { useTheme } from '@/constants/theme';
import {
  geocodeAddress,
  getCurrentPosition,
  type GeoPoint,
} from '@/lib/geo/location';

export interface PlacePickerResult {
  lat: number;
  lng: number;
  label: string;
}

export interface PlacePickerSheetProps {
  visible: boolean;
  title: string;
  initialPosition?: { lat: number; lng: number };
  onClose: () => void;
  onSelect: (place: PlacePickerResult) => void;
}

/**
 * Modal unifié de choix de lieu (recherche, GPS, carte, lieux populaires).
 */
export function PlacePickerSheet({
  visible,
  title,
  initialPosition,
  onClose,
  onSelect,
}: PlacePickerSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  function finish(place: PlacePickerResult) {
    setSearchText('');
    setError(null);
    setMapOpen(false);
    onSelect(place);
    onClose();
  }

  async function handleSearch() {
    setError(null);
    if (!searchText.trim()) {
      setError('Saisissez une adresse à rechercher.');
      return;
    }

    setSearchLoading(true);
    try {
      const coords = await geocodeAddress(
        `${searchText.trim()}, Cotonou, Bénin`,
      );
      if (!coords) {
        setError('Adresse introuvable. Essayez un lieu populaire.');
        return;
      }
      finish({
        lat: coords.lat,
        lng: coords.lng,
        label: searchText.trim(),
      });
    } catch {
      setError('La recherche a échoué. Réessayez.');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleCurrentPosition() {
    setError(null);
    setGpsLoading(true);
    try {
      const point: GeoPoint = await getCurrentPosition();
      finish(point);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible d’obtenir votre position.',
      );
    } finally {
      setGpsLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}>
        <View
          style={{
            height: '75%',
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.layout.panelTopRadius,
            borderTopRightRadius: theme.layout.panelTopRadius,
            paddingBottom: insets.bottom + theme.spacing.md,
            ...theme.shadow.soft,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.md,
            }}>
            <Text
              style={{
                flex: 1,
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.panelTitle,
                lineHeight: theme.layout.panelTitle + theme.spacing.sm,
                color: theme.colors.textPrimary,
              }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({
                width: theme.layout.touchMin,
                height: theme.layout.touchMin,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}>
              <X
                size={theme.icon.size}
                strokeWidth={theme.icon.strokeWidth}
                color={theme.colors.textPrimary}
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
            }}>
            <Input
              label="Rechercher une adresse"
              icon={MapPin}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Ex. Fidjrossè, Cotonou"
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={() => void handleSearch()}
            />
            <Button
              label="Rechercher"
              variant="secondary"
              loading={searchLoading}
              onPress={() => void handleSearch()}
            />

            <View style={{ height: theme.spacing.md }} />

            <Button
              label="Ma position actuelle"
              variant="secondary"
              icon={Navigation}
              loading={gpsLoading}
              onPress={() => void handleCurrentPosition()}
            />

            <View style={{ height: theme.spacing.sm }} />

            <Button
              label="Choisir sur la carte"
              variant="secondary"
              icon={MapPin}
              onPress={() => setMapOpen(true)}
            />

            {error ? (
              <Text
                style={{
                  marginTop: theme.spacing.md,
                  fontFamily: theme.fonts.jakartaRegular,
                  color: theme.colors.brick,
                }}>
                {error}
              </Text>
            ) : null}

            <Text
              style={{
                marginTop: theme.spacing.xl,
                marginBottom: theme.spacing.sm,
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.typography.label.fontSize,
                color: theme.colors.textPrimary,
              }}>
              Lieux populaires
            </Text>

            {POPULAR_PLACES.map((place) => (
              <Pressable
                key={place.name}
                accessibilityRole="button"
                onPress={() =>
                  finish({
                    lat: place.lat,
                    lng: place.lng,
                    label: place.name,
                  })
                }
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: theme.layout.touchMin,
                  paddingVertical: theme.spacing.sm,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.border,
                  opacity: pressed ? 0.75 : 1,
                })}>
                <MapPin
                  size={theme.icon.size}
                  strokeWidth={theme.icon.strokeWidth}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={{
                    marginLeft: theme.spacing.md,
                    flex: 1,
                    fontFamily: theme.fonts.jakartaRegular,
                    fontSize: theme.typography.body.fontSize,
                    color: theme.colors.textPrimary,
                  }}>
                  {place.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {mapOpen ? (
        <MapPointPicker
          title={title}
          initialPosition={initialPosition ?? COTONOU_CENTER}
          onCancel={() => setMapOpen(false)}
          onConfirm={(point) => finish(point)}
        />
      ) : null}
    </Modal>
  );
}
