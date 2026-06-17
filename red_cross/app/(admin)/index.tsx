import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UsefulLinksSection } from '@/components/home/UsefulLinksSection';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

export default function AdminHome() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <UsefulLinksSection subtitle="Brz pristup zvaničnim kanalima organizacije." />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
