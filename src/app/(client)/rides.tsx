import { StyleSheet, View } from 'react-native';

import { RidesList } from '@/components/client/RidesList';
import { theme } from '@/constants/theme';

/** Conservé pour navigation directe ; hors barre d'onglets. */
export default function ClientRidesScreen() {
  return (
    <View style={styles.screen}>
      <RidesList showTitle />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
