import { StyleSheet, View } from 'react-native';

import { DeliveriesList } from '@/components/client/DeliveriesList';
import { theme } from '@/constants/theme';

/** Conservé pour navigation directe ; hors barre d'onglets. */
export default function ClientDeliveriesScreen() {
  return (
    <View style={styles.screen}>
      <DeliveriesList showTitle />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
