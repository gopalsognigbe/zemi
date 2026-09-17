import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/constants/theme';
import {
  getCurrentPosition,
  reverseGeocodeLabel,
} from '@/lib/geo/location';

import {
  COTONOU_CENTER,
  type MapPointPickerProps,
} from './mapShared';
import { buildOsmMapHtml } from './osmMapHtml';

export type { MapPointPickerProps } from './mapShared';

const DEBOUNCE_MS = 800;

/**
 * Sélecteur de point sur carte OpenStreetMap (WebView).
 * Google Maps est volontairement évité : les tuiles ne chargent plus dans Expo Go.
 */
export function MapPointPicker({
  initialPosition,
  title,
  confirmLabel = 'Confirmer ce point',
  onConfirm,
  onCancel,
}: MapPointPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerRef = useRef({
    lat: initialPosition?.lat ?? COTONOU_CENTER.lat,
    lng: initialPosition?.lng ?? COTONOU_CENTER.lng,
  });

  const [address, setAddress] = useState("Recherche de l'adresse…");
  const [geocoding, setGeocoding] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const html = buildOsmMapHtml({
    lat: centerRef.current.lat,
    lng: centerRef.current.lng,
    zoom: 15,
    accentHex: theme.colors.brick,
    showCenterDot: false,
  });

  const reverseLookup = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    setAddress("Recherche de l'adresse…");
    const label = await reverseGeocodeLabel(lat, lng);
    setAddress(label);
    setGeocoding(false);
  }, []);

  const panTo = useCallback((lat: number, lng: number, animate: boolean) => {
    const js = `window.setMapCenter(${lat}, ${lng}, ${animate ? 'true' : 'false'}); true;`;
    webRef.current?.injectJavaScript(js);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (initialPosition) {
        void reverseLookup(centerRef.current.lat, centerRef.current.lng);
        return;
      }

      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;
        centerRef.current = { lat: pos.lat, lng: pos.lng };
        if (mapReady) {
          panTo(pos.lat, pos.lng, false);
        }
        void reverseLookup(pos.lat, pos.lng);
      } catch {
        if (!cancelled) {
          void reverseLookup(centerRef.current.lat, centerRef.current.lng);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [initialPosition, reverseLookup, mapReady, panTo]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type: string;
        lat?: number;
        lng?: number;
      };

      if (data.type === 'ready') {
        setMapReady(true);
        const { lat, lng } = centerRef.current;
        panTo(lat, lng, false);
        return;
      }

      if (
        data.type === 'center' &&
        typeof data.lat === 'number' &&
        typeof data.lng === 'number'
      ) {
        centerRef.current = { lat: data.lat, lng: data.lng };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void reverseLookup(data.lat!, data.lng!);
        }, DEBOUNCE_MS);
      }
    } catch {
      // ignore malformed messages
    }
  }

  async function handleMyPosition() {
    try {
      const pos = await getCurrentPosition();
      centerRef.current = { lat: pos.lat, lng: pos.lng };
      panTo(pos.lat, pos.lng, true);
      void reverseLookup(pos.lat, pos.lng);
    } catch {
      setAddress("Impossible d'obtenir votre position.");
      setGeocoding(false);
    }
  }

  function handleConfirm() {
    onConfirm({
      lat: centerRef.current.lat,
      lng: centerRef.current.lng,
      label: geocoding
        ? `${centerRef.current.lat.toFixed(4)}, ${centerRef.current.lng.toFixed(4)}`
        : address,
    });
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          paddingTop: insets.top,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            minHeight: theme.layout.touchMin,
          }}>
          <Text
            style={{
              flex: 1,
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: theme.typography.subtitle.fontSize,
              color: theme.colors.textPrimary,
            }}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            hitSlop={12}
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

        <View style={{ flex: 1, position: 'relative' }}>
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html }}
            onMessage={handleMessage}
            style={{ flex: 1, backgroundColor: theme.colors.border }}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            allowsInlineMediaPlayback
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MapPin
              size={theme.spacing.xxl + theme.spacing.sm}
              color={theme.colors.brick}
              fill={theme.colors.brick}
              strokeWidth={theme.icon.strokeWidth}
              style={{ marginBottom: theme.spacing.xxl }}
            />
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}>
          <Pressable
            accessibilityRole="button"
            onPress={handleMyPosition}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              minHeight: theme.layout.touchMin,
              justifyContent: 'center',
              marginBottom: theme.spacing.md,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.amber100,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Text
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.homeCaption,
                color: theme.colors.green900,
              }}>
              Ma position
            </Text>
          </Pressable>

          <View style={{ marginBottom: theme.spacing.md }}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaRegular,
                fontSize: theme.layout.chatContextSize,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.xs,
              }}>
              Adresse sélectionnée
            </Text>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.textPrimary,
              }}>
              {address}
            </Text>
          </View>

          <Button
            label={confirmLabel}
            disabled={geocoding}
            onPress={handleConfirm}
          />
          <View style={{ marginTop: theme.spacing.sm }}>
            <Button label="Annuler" variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
