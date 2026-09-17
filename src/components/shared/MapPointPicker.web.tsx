import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { POPULAR_PLACES } from '@/constants/places';
import { theme, typography } from '@/constants/theme';

import {
  COTONOU_CENTER,
  type MapPointPickerProps,
} from './mapShared';

export type { MapPointPickerProps } from './mapShared';

export function MapPointPicker({
  initialPosition,
  title,
  confirmLabel = 'Confirmer ce point',
  onConfirm,
  onCancel,
}: MapPointPickerProps) {
  const [selected, setSelected] = useState<{
    lat: number;
    lng: number;
    label: string;
  }>({
    lat: initialPosition?.lat ?? COTONOU_CENTER.lat,
    lng: initialPosition?.lng ?? COTONOU_CENTER.lng,
    label: 'Point sélectionné',
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text style={styles.cancelLink}>Fermer</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.hint}>
            Sur le web, choisissez un lieu ci-dessous. La carte interactive
            est disponible sur l&apos;application mobile.
          </Text>

          {POPULAR_PLACES.map((place) => {
            const active =
              selected.lat === place.lat && selected.lng === place.lng;
            return (
              <Pressable
                key={place.name}
                style={[styles.placeRow, active && styles.placeRowActive]}
                onPress={() =>
                  setSelected({
                    lat: place.lat,
                    lng: place.lng,
                    label: place.name,
                  })
                }>
                <Text
                  style={[styles.placeText, active && styles.placeTextActive]}>
                  {place.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.panel}>
          <Button
            label={confirmLabel}
            onPress={() =>
              onConfirm({
                lat: selected.lat,
                lng: selected.lng,
                label: selected.label,
              })
            }
          />
          <View style={styles.mtSm}>
            <Button label="Annuler" variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    ...typography('subtitle'),
    color: theme.colors.ink,
    flex: 1,
  },
  cancelLink: {
    ...typography('body'),
    color: theme.colors.grey,
    textDecorationLine: 'underline',
  },
  content: {
    padding: theme.spacing.lg,
  },
  hint: {
    ...typography('body'),
    color: theme.colors.grey,
    marginBottom: theme.spacing.md,
  },
  placeRow: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  placeRowActive: {
    borderColor: theme.colors.green,
    backgroundColor: theme.colors.amberSoft,
  },
  placeText: {
    ...typography('body'),
    color: theme.colors.ink,
  },
  placeTextActive: {
    color: theme.colors.greenDark,
    fontWeight: '600',
  },
  panel: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  mtSm: {
    marginTop: theme.spacing.sm,
  },
});
