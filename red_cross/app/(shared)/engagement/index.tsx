import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

export default function EngagementScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.back()} />

        <View>
          <Text style={styles.title}>Moje angažovanje</Text>
          <Text style={styles.subtitle}>
            Ovde pratite svoje volontersko angažovanje. Pozivi i dodeljene
            aktivnosti pripadaju vašoj ulozi učesnika, dok su tabovi u glavnom
            meniju namenjeni dodatnim ovlašćenjima u sistemu.
          </Text>
        </View>

        <ActionCard
          title="Moji pozivi"
          description="Pregledajte aktivne i prethodne pozive za eksterne aktivnosti."
          iconName="notifications-outline"
          onPress={() => router.push('/(shared)/engagement/invitations' as any)}
        />

        <ActionCard
          title="Dodeljene aktivnosti"
          description="Otvorite aktivnosti za koje vam je potvrđeno učešće."
          iconName="calendar-outline"
          onPress={() => router.push('/(shared)/engagement/activities' as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  title,
  description,
  iconName,
  onPress,
}: {
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={24} color={Colors.primary} />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={20}
        color={Colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: '#FFF',
    padding: Spacing.md,
  },
  cardPressed: {
    opacity: 0.82,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
