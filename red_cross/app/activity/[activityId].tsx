import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/hooks/useAuth';
import { Activity, InternalActivityAttendance } from '@/models/Activity';
import { AppUser } from '@/models/User';
import { getInternalActivityAttendances } from '@/services/activityAttendanceService';
import { cancelActivity, getActivityById } from '@/services/activityService';
import { getUserById } from '@/services/userService';

export default function ActivityDetailsScreen() {
  const { appUser } = useAuth();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [creator, setCreator] = useState<AppUser | null>(null);
  const [attendanceItems, setAttendanceItems] = useState<AttendanceListItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshingAttendance, setRefreshingAttendance] = useState(false);
  const [cancellingActivity, setCancellingActivity] = useState(false);
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
        await loadAttendanceItems(loadedActivity.id);
      }
    } catch (loadError) {
      console.error('Error loading activity details:', loadError);
      setError('Došlo je do greške prilikom učitavanja aktivnosti.');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceItems = async (internalActivityId: string) => {
    const attendances = await getInternalActivityAttendances(internalActivityId);
    const loadedUsers = await Promise.all(
      attendances.map(attendance => getUserById(attendance.userId))
    );
    const items = attendances
      .map((attendance, index) => {
        const user = loadedUsers[index];

        if (!user) {
          return null;
        }

        return {
          attendance,
          user,
        };
      })
      .filter((item): item is AttendanceListItem => Boolean(item));

    setAttendanceItems(items);
  };

  const refreshAttendanceItems = async () => {
    if (!activity || activity.type !== 'INTERNAL') {
      return;
    }

    try {
      setRefreshingAttendance(true);
      await loadAttendanceItems(activity.id);
    } catch (refreshError) {
      console.error('Error refreshing activity attendance:', refreshError);
    } finally {
      setRefreshingAttendance(false);
    }
  };

  const handleCancelActivity = () => {
    if (!activity) {
      return;
    }

    Alert.alert(
      'Otkazivanje aktivnosti',
      'Da li ste sigurni da želite da otkažete ovu aktivnost?',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Otkaži aktivnost',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingActivity(true);
              await cancelActivity(activity.id);
              await loadActivity();
            } catch (cancelError) {
              console.error('Error cancelling activity:', cancelError);
              Alert.alert(
                'Greška',
                'Došlo je do greške prilikom otkazivanja aktivnosti.'
              );
            } finally {
              setCancellingActivity(false);
            }
          },
        },
      ]
    );
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

        {canCancelInternalActivity(activity, appUser?.id) ? (
          <Pressable
            style={({ pressed }) => [
              styles.cancelActivityButton,
              pressed ? styles.cancelActivityButtonPressed : null,
            ]}
            onPress={handleCancelActivity}
            disabled={cancellingActivity}
          >
            {cancellingActivity ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.cancelActivityButtonText}>
                Otkaži aktivnost
              </Text>
            )}
          </Pressable>
        ) : null}

        {activity.type === 'INTERNAL' ? (
          <InternalActivityQrSection
            activity={activity}
            attendanceItems={attendanceItems}
            refreshingAttendance={refreshingAttendance}
            onRefreshAttendance={refreshAttendanceItems}
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

function canCancelInternalActivity(activity: Activity, userId?: string) {
  if (
    activity.type !== 'INTERNAL' ||
    activity.status !== 'ACTIVE' ||
    activity.createdByUserId !== userId
  ) {
    return false;
  }

  const endDate = new Date(activity.endDateTime);

  if (Number.isNaN(endDate.getTime())) {
    return false;
  }

  return new Date() < endDate;
}

function InternalActivityQrSection({
  activity,
  attendanceItems,
  refreshingAttendance,
  onRefreshAttendance,
}: {
  activity: Activity;
  attendanceItems: AttendanceListItem[];
  refreshingAttendance: boolean;
  onRefreshAttendance: () => void;
}) {
  if (activity.type !== 'INTERNAL') {
    return null;
  }

  const qrValue = JSON.stringify({
    type: 'INTERNAL_ACTIVITY_ATTENDANCE',
    activityId: activity.id,
    qrToken: activity.qrToken,
  });
  const qrValidTo = new Date(activity.qrValidTo);
  const isQrExpired = Number.isNaN(qrValidTo.getTime())
    ? true
    : new Date() > qrValidTo;
  const isCancelled = activity.status === 'CANCELLED';

  return (
    <View style={styles.section}>
      {isCancelled ? (
        <>
          <Text style={styles.sectionTitle}>Aktivnost je otkazana</Text>
          <Text style={styles.sectionDescription}>
            QR kod za evidentiranje prisustva nije dostupan za otkazanu aktivnost.
          </Text>
        </>
      ) : isQrExpired ? (
        <>
          <Text style={styles.sectionTitle}>QR kod je istekao</Text>
          <Text style={styles.sectionDescription}>
            QR kod za evidentiranje prisustva više nije aktivan.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>QR kod za prisustvo</Text>
          <Text style={styles.sectionDescription}>
            Volonteri skeniraju ovaj kod kako bi evidentirali prisustvo na internoj aktivnosti.
          </Text>

          <View style={styles.qrContainer}>
            <QRCode value={qrValue} size={220} />
          </View>
        </>
      )}

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
        <View style={styles.attendanceHeader}>
          <Text style={styles.sectionTitle}>Evidentirani prisutni</Text>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed ? styles.refreshButtonPressed : null,
            ]}
            onPress={onRefreshAttendance}
            disabled={refreshingAttendance}
          >
            {refreshingAttendance ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.refreshButtonText}>↻</Text>
            )}
          </Pressable>
        </View>

        {attendanceItems.length > 0 ? (
          <ScrollView
            style={styles.attendeeList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {attendanceItems.map(item => (
              <AttendanceItem key={item.user.id} item={item} />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyAttendanceText}>
            Za sada nema evidentiranih prisutnih.
          </Text>
        )}
      </View>
    </View>
  );
}

type AttendanceListItem = {
  attendance: InternalActivityAttendance;
  user: AppUser;
};

function AttendanceItem({ item }: { item: AttendanceListItem }) {
  return (
    <View style={styles.attendeeItem}>
      <View style={styles.attendeeInfo}>
        <Text style={styles.attendeeName}>
          {item.user.firstName} {item.user.lastName}
        </Text>
        <Text style={styles.attendeeRole}>{formatRole(item.user.role)}</Text>
      </View>

      <Text style={styles.checkedInAt}>
        {formatDateTime(item.attendance.checkedInAt)}
      </Text>
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
  cancelActivityButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  cancelActivityButtonPressed: {
    opacity: 0.85,
  },
  cancelActivityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
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
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  refreshButtonPressed: {
    opacity: 0.75,
  },
  refreshButtonText: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  attendeeList: {
    maxHeight: 320,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    marginBottom: Spacing.sm,
  },
  attendeeInfo: {
    flex: 1,
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
  checkedInAt: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
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
