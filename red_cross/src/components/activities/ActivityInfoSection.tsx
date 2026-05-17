import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Activity, ActivityStatus, ActivityType } from '@/models/Activity';
import { AppUser } from '@/models/User';

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

type ActivityInfoSectionProps = {
  activity: Activity;
  creator?: AppUser | null;
};

export function ActivityInfoSection({
  activity,
  creator,
}: ActivityInfoSectionProps) {
  const creatorName = creator
    ? `${creator.firstName} ${creator.lastName}`
    : 'Nepoznat korisnik';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.location}>{activity.location}</Text>
        </View>

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabels[activity.type]}</Text>
        </View>
      </View>

      {activity.description ? (
        <Text style={styles.description}>{activity.description}</Text>
      ) : null}

      <View style={styles.rows}>
        <InfoRow label="Početak" value={formatDateTime(activity.startDateTime)} />
        <InfoRow label="Završetak" value={formatDateTime(activity.endDateTime)} />
        <InfoRow label="Status" value={statusLabels[activity.status]} />
        <InfoRow label="Kreirao/la" value={creatorName} />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  section: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  location: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
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
    marginBottom: Spacing.md,
  },
  rows: {
    gap: Spacing.sm,
  },
  infoRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
