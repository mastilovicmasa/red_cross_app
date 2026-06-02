import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Assignment, AssignmentStatus } from '@/models/Assignment';
import { Activity } from '@/models/Activity';
import { getVolunteerAssignment } from '@/services/assignmentService';
import { getActivityById } from '@/services/activityService';

const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  ASSIGNED: 'Potvrđeno učešće',
  CANCELLED: 'Otkazano angažovanje',
  COMPLETED: 'Realizovano',
};

export default function VolunteerActivityDetailsScreen() {
  const { appUser } = useAuth();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activityId, appUser?.id]);

  const loadData = async () => {
    if (!activityId || !appUser?.id || appUser.role !== 'VOLUNTEER') {
      setError('Aktivnost nije pronađena.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [loadedActivity, loadedAssignment] = await Promise.all([
        getActivityById(activityId),
        getVolunteerAssignment(activityId, appUser.id),
      ]);

      if (!loadedActivity || !loadedAssignment) {
        setError('Aktivnost nije pronađena.');
        return;
      }

      setActivity(loadedActivity);
      setAssignment(loadedAssignment);
    } catch (loadError) {
      console.error('Error loading volunteer activity details:', loadError);
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

  if (error || !activity || !assignment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <CustomButton title="Nazad" onPress={() => router.back()} />
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
        <BackButton onPress={() => router.back()} />

        <Text style={styles.screenTitle}>Detalji aktivnosti</Text>

        <View style={styles.section}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <Text style={styles.location}>{activity.location}</Text>

          {activity.description ? (
            <Text style={styles.description}>{activity.description}</Text>
          ) : null}

          <InfoRow label="Početak" value={formatDateTime(activity.startDateTime)} />
          <InfoRow label="Završetak" value={formatDateTime(activity.endDateTime)} />
          <InfoRow
            label="Status angažovanja"
            value={assignmentStatusLabels[assignment.status]}
          />
        </View>

        {assignment.status === 'ASSIGNED' ? (
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentInfoTitle}>
              Potvrđeno vam je učešće na aktivnosti.
            </Text>
            <Text style={styles.assignmentInfoText}>
              U slučaju sprečenosti kontaktirajte zaposlenog.
            </Text>
          </View>
        ) : assignment.status === 'CANCELLED' ? (
          <View style={styles.cancelledInfo}>
            <Text style={styles.cancelledInfoTitle}>
              Vaše angažovanje na ovoj aktivnosti je otkazano.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  section: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
    padding: Spacing.md,
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  location: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  assignmentInfo: {
    borderRadius: 8,
    backgroundColor: '#E7F8EF',
    padding: Spacing.md,
  },
  assignmentInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B7F46',
  },
  assignmentInfoText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1B7F46',
    marginTop: 2,
  },
  cancelledInfo: {
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
  },
  cancelledInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
