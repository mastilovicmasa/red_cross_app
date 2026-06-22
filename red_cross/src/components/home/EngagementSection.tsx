import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

type EngagementSectionProps = {
  title?: string;
  subtitle?: string;
};

export function EngagementSection({
  title = 'Moje angazovanje',
  subtitle = 'Ovde pratite svoje volonterske pozive i aktivnosti, dok su tabovi ispod namenjeni vasim dodatnim ovlascenjima u sistemu.',
}: EngagementSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.list}>
        <ActionCard
          title="Moji pozivi"
          description="Pregledajte aktivne i prethodne pozive za eksterne aktivnosti."
          iconName="notifications-outline"
          onPress={() => router.push('/(shared)/engagement/invitations' as any)}
        />

        <ActionCard
          title="Dodeljene aktivnosti"
          description="Otvorite aktivnosti za koje vam je potvrdjeno ucesce."
          iconName="calendar-outline"
          onPress={() => router.push('/(shared)/engagement/activities' as any)}
        />
      </View>
    </View>
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
        <Ionicons name={iconName} size={22} color={Colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
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
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  list: {
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    padding: Spacing.md,
  },
  cardPressed: {
    opacity: 0.82,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
