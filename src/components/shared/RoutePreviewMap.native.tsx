import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '@/constants/theme';
import type { LatLng } from '@/types';

import { COTONOU_CENTER } from './mapShared';
import { buildOsmMapHtml } from './osmMapHtml';

export interface RoutePreviewMapProps {
  pickup?: LatLng;
  destination?: LatLng;
  height?: number;
}

/**
 * Aperçu du trajet (ligne directe en pointillés — sans API Directions).
 */
export function RoutePreviewMap({
  pickup,
  destination,
  height = 280,
}: RoutePreviewMapProps) {
  const theme = useTheme();
  const focus = pickup ?? destination ?? COTONOU_CENTER;
  const markers = useMemo(
    () => [
      ...(pickup
        ? [{ lat: pickup.lat, lng: pickup.lng, color: theme.colors.green500 }]
        : []),
      ...(destination
        ? [
            {
              lat: destination.lat,
              lng: destination.lng,
              color: theme.colors.brick,
            },
          ]
        : []),
    ],
    [destination, pickup, theme.colors.brick, theme.colors.green500],
  );
  const html = useMemo(
    () =>
      buildOsmMapHtml({
        lat: focus.lat,
        lng: focus.lng,
        zoom: 14,
        accentHex: theme.colors.green700,
        markers,
        polyline:
          pickup && destination
            ? [
                { lat: pickup.lat, lng: pickup.lng },
                { lat: destination.lat, lng: destination.lng },
              ]
            : undefined,
        fitPoints: Boolean(pickup && destination),
      }),
    [
      destination,
      focus.lat,
      focus.lng,
      markers,
      pickup,
      theme.colors.green700,
    ],
  );

  return (
    <View style={{ height, backgroundColor: theme.colors.border }}>
      <WebView
        key={`${focus.lat}-${focus.lng}-${destination?.lat ?? 'none'}`}
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: theme.colors.border }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
