import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { theme } from '@/constants/theme';
import type { LatLng } from '@/types';

import {
  FIT_PADDING,
  MAP_HEIGHT,
  useSmoothedPosition,
  type TrackingMapProps,
} from './trackingMapShared';

export type { TrackingMapProps } from './trackingMapShared';

export function TrackingMap({
  pickup,
  destination,
  driverPosition,
  pickupLabel = 'Départ',
  destinationLabel = 'Destination',
  height = MAP_HEIGHT,
  bottomPadding,
}: TrackingMapProps) {
  const mapRef = useRef<MapView>(null);
  const hasFitRef = useRef(false);
  const hadDriverRef = useRef(false);
  const smoothedDriver = useSmoothedPosition(driverPosition);

  const fill = height === 'fill';
  const edgeBottom = bottomPadding ?? FIT_PADDING;

  const points: LatLng[] = [pickup, destination];
  if (smoothedDriver) points.push(smoothedDriver);

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.fitToCoordinates(
      points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      {
        edgePadding: {
          top: FIT_PADDING + theme.spacing.xxl,
          right: FIT_PADDING,
          bottom: edgeBottom,
          left: FIT_PADDING,
        },
        animated: hasFitRef.current,
      },
    );
    hasFitRef.current = true;
  }, [
    pickup.lat,
    pickup.lng,
    destination.lat,
    destination.lng,
    edgeBottom,
  ]);

  useEffect(() => {
    if (!mapRef.current || !smoothedDriver || hadDriverRef.current) {
      return;
    }

    hadDriverRef.current = true;
    mapRef.current.fitToCoordinates(
      points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      {
        edgePadding: {
          top: FIT_PADDING + theme.spacing.xxl,
          right: FIT_PADDING,
          bottom: edgeBottom,
          left: FIT_PADDING,
        },
        animated: true,
      },
    );
  }, [smoothedDriver?.lat, smoothedDriver?.lng, edgeBottom]);

  const initialRegion: Region = {
    latitude: pickup.lat,
    longitude: pickup.lng,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  return (
    <View
      style={[
        styles.wrapper,
        fill
          ? styles.fill
          : {
              height: typeof height === 'number' ? height : MAP_HEIGHT,
            },
        fill ? styles.fillChrome : null,
      ]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={false}>
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          title={pickupLabel}
          anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pickupPin}>
            <View style={styles.pickupDot} />
          </View>
        </Marker>
        <Marker
          coordinate={{ latitude: destination.lat, longitude: destination.lng }}
          title={destinationLabel}
          pinColor={theme.colors.brick}
        />
        {smoothedDriver ? (
          <Marker
            coordinate={{
              latitude: smoothedDriver.lat,
              longitude: smoothedDriver.lng,
            }}
            title="Votre zem"
            anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.driverMarker}>
              <View style={styles.driverDot} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  fill: {
    ...StyleSheet.absoluteFill,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  fillChrome: {
    borderRadius: 0,
    borderWidth: 0,
    marginBottom: 0,
  },
  map: {
    flex: 1,
  },
  pickupPin: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.soft,
  },
  pickupDot: {
    width: theme.spacing.md,
    height: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.green500,
  },
  driverMarker: {
    width: theme.spacing.xl + theme.spacing.sm,
    height: theme.spacing.xl + theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.green700,
  },
  driverDot: {
    width: theme.spacing.md + 2,
    height: theme.spacing.md + 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.amber500,
  },
});
