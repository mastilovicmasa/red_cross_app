import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Activity, ActivityStatus, ActivityType } from '@/models/Activity';

const statusLabels: Record<ActivityStatus, string> = {
  DRAFT: 'Nacrt',
  ACTIVE: 'Aktivna',
  IN_PROGRESS: 'U toku',
  COMPLETED: 'Završena',
  CANCELLED: 'Otkazana',
};

const typeLabels: Record<ActivityType, string> = {
  INTERNAL: 'Interna',
  EXTERNAL: 'Eksterna',
};

type ActivityCardProps = {
  activity: Activity;
  onPress?: () => void;
};

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? styles.cardPressed : null,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{activity.title}</Text>
          <Text style={styles.cardSubtitle}>{activity.location}</Text>
        </View>

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabels[activity.type]}</Text>
        </View>
      </View>

      {activity.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {activity.description}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.metaText}>
          {formatDateTime(activity.startDateTime)}
        </Text>
      </View>

      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{statusLabels[activity.status]}</Text>
      </View>
    </Pressable>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Datum nije podešen';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year}. ${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeBadge: {
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
