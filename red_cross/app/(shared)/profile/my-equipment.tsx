import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import { MyIssuedEquipmentScreen } from '@/components/equipment/MyIssuedEquipmentScreen';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

export default function MyEquipmentScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Zaduzena oprema</Text>
        <Text style={styles.subtitle}>
          Pregledajte opremu koja vam je trenutno izdata.
        </Text>
      </View>

      <View style={styles.content}>
        <MyIssuedEquipmentScreen showHeader={false} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
});
