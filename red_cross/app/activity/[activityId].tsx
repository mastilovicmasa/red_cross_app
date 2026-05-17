import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityInfoSection } from '@/components/activities/ActivityInfoSection';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Activity } from '@/models/Activity';
import { AppUser } from '@/models/User';
import { getInternalActivityAttendances } from '@/services/activityAttendanceService';
import { getActivityById } from '@/services/activityService';
import { getUserById } from '@/services/userService';

export default function ActivityDetailsScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [creator, setCreator] = useState<AppUser | null>(null);
  const [attendees, setAttendees] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivity();
  }, [activityId]);

  const loadActivity = async () => {
    if (!activityId) {
      setError('Aktivnost nije pronađena.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const loadedActivity = await getActivityById(activityId);

      if (!loadedActivity) {
        setError('Aktivnost nije pronađena.');
        return;
      }

      setActivity(loadedActivity);

      const loadedCreator = await getUserById(loadedActivity.createdByUserId);
      setCreator(loadedCreator);

      if (loadedActivity.type === 'INTERNAL') {
        const attendances = await getInternalActivityAttendances(
          loadedActivity.id
        );
        const loadedAttendees = await Promise.all(
          attendances.map(attendance => getUserById(attendance.userId))
        );

        setAttendees(
          loadedAttendees.filter((user): user is AppUser => Boolean(user))
        );
      }
    } catch (loadError) {
      console.error('Error loading activity details:', loadError);
      setError('Došlo je do greške prilikom učitavanja aktivnosti.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error || 'Aktivnost nije pronađena.'}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Nazad</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Detalji aktivnosti</Text>

        <ActivityInfoSection activity={activity} creator={creator} />

        {activity.type === 'INTERNAL' ? (
          <InternalActivityQrSection
            activity={activity}
            attendees={attendees}
          />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eksterna aktivnost</Text>
            <Text style={styles.sectionDescription}>
              Detaljan prikaz eksternih aktivnosti biće dodat u sledećem koraku.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InternalActivityQrSection({
  activity,
  attendees,
}: {
  activity: Activity;
  attendees: AppUser[];
}) {
  if (activity.type !== 'INTERNAL') {
    return null;
  }

  const qrValue = JSON.stringify({
    type: 'INTERNAL_ACTIVITY_ATTENDANCE',
    activityId: activity.id,
    qrToken: activity.qrToken,
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>QR kod za prisustvo</Text>
      <Text style={styles.sectionDescription}>
        Volonteri skeniraju ovaj kod kako bi evidentirali prisustvo na internoj aktivnosti.
      </Text>

      <View style={styles.qrContainer}>
        <QRCode value={qrValue} size={220} />
      </View>

      <View style={styles.validityBox}>
        <Text style={styles.validityLabel}>Validan od</Text>
        <Text style={styles.validityValue}>
          {formatDateTime(activity.qrValidFrom)}
        </Text>

        <Text style={styles.validityLabel}>Validan do</Text>
        <Text style={styles.validityValue}>
          {formatDateTime(activity.qrValidTo)}
        </Text>
      </View>

      <View style={styles.attendanceSection}>
        <Text style={styles.sectionTitle}>Evidentirani prisutni</Text>

        {attendees.length > 0 ? (
          <View style={styles.attendeeList}>
            {attendees.map(attendee => (
              <View key={attendee.id} style={styles.attendeeItem}>
                <Text style={styles.attendeeName}>
                  {attendee.firstName} {attendee.lastName}
                </Text>
                <Text style={styles.attendeeRole}>
                  {formatRole(attendee.role)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyAttendanceText}>
            Za sada nema evidentiranih prisutnih.
          </Text>
        )}
      </View>
    </View>
  );
}

function formatRole(role: string) {
  switch (role) {
    case 'VOLUNTEER':
      return 'Volonter';
    case 'EMPLOYEE':
      return 'Zaposleni';
    case 'EXECUTIVE_BOARD':
      return 'Član izvršnog odbora';
    case 'INSTRUCTOR':
      return 'Instruktor';
    case 'ADMIN':
      return 'Administrator';
    default:
      return role;
  }
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
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  validityBox: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  validityLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  validityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  attendanceSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  attendeeList: {
    gap: Spacing.sm,
  },
  attendeeItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  attendeeRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyAttendanceText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  centerContent: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
