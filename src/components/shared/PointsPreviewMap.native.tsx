import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '@/constants/theme';

import { COTONOU_CENTER, type PointsPreviewMapProps } from './mapShared';
import { buildOsmMapHtml } from './osmMapHtml';

export type { PointsPreviewMapProps } from './mapShared';

export function PointsPreviewMap({ points, height = 160 }: PointsPreviewMapProps) {
  const theme = useTheme();
  const first = points[0] ?? COTONOU_CENTER;
  const markers = useMemo(
    () =>
      points.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        color: point.pinColor ?? theme.colors.green500,
      })),
    [points, theme.colors.green500],
  );
  const html = useMemo(
    () =>
      buildOsmMapHtml({
        lat: first.lat,
        lng: first.lng,
        zoom: 14,
        accentHex: theme.colors.green700,
        markers,
        fitPoints: points.length > 1,
      }),
    [first.lat, first.lng, markers, points.length, theme.colors.green700],
  );

  if (points.length === 0) return null;

  return (
    <View
      style={{
        height,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.md,
      }}>
      <WebView
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
