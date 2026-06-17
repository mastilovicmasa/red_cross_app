import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Assignment } from '@/models/Assignment';
import { ExternalActivity } from '@/models/Activity';
import { Photo } from '@/models/Photo';
import { AppUser } from '@/models/User';
import { getActivityAssignments } from '@/services/assignmentService';
import { getAssignmentPhotos } from '@/services/activityReportService';
import { getActivityById } from '@/services/activityService';
import { getAllUsers } from '@/services/userService';

type ReportListItem = {
  volunteer: AppUser;
  assignment: Assignment;
  reportPhotos: Photo[];
};

export default function ActivityReportsScreen() {
  const { appUser } = useAuth();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<ExternalActivity | null>(null);
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activityId, appUser?.id]);

  const loadData = async () => {
    if (!activityId || !appUser?.id) {
      setError('Aktivnost nije pronadjena.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const loadedActivity = await getActivityById(activityId);

      if (
        !loadedActivity ||
        loadedActivity.type !== 'EXTERNAL' ||
        loadedActivity.status !== 'ACTIVE' ||
        loadedActivity.createdByUserId !== appUser.id ||
        appUser.role !== 'EMPLOYEE'
      ) {
        setError('Nemate dozvolu za pregled izvestaja za ovu aktivnost.');
        return;
      }

      const [loadedAssignments, loadedUsers] = await Promise.all([
        getActivityAssignments(activityId),
        getAllUsers(),
      ]);
      const usersById = new Map(loadedUsers.map(user => [user.id, user]));
      const assignedAssignments = loadedAssignments.filter(
        assignment => assignment.status === 'ASSIGNED'
      );

      const loadedItems = await Promise.all(
        assignedAssignments.map(async assignment => {
          const volunteer = usersById.get(assignment.volunteerId);

          if (!volunteer) {
            return null;
          }

          return {
            volunteer,
            assignment,
            reportPhotos: await getAssignmentPhotos(activityId, assignment.volunteerId),
          };
        })
      );

      setActivity(loadedActivity);
      setItems(
        loadedItems
          .filter((item): item is ReportListItem => Boolean(item))
          .sort((first, second) =>
            formatVolunteerName(first.volunteer).localeCompare(
              formatVolunteerName(second.volunteer)
            )
          )
      );
    } catch (loadError) {
      console.error('Error loading activity reports:', loadError);
      setError('Doslo je do greske prilikom ucitavanja izvestaja.');
    } finally {
      setLoading(false);
    }
  };

  const submittedCount = useMemo(
    () => items.filter(item => item.assignment.reportSubmittedAt).length,
    [items]
  );

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
          <Text style={styles.errorText}>{error}</Text>
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
        <BackButton onPress={() => router.back()} />

        <View>
          <Text style={styles.title}>Pregled izvestaja</Text>
          <Text style={styles.subtitle}>{activity.title}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Stanje predaje</Text>
          <Text style={styles.summaryText}>
            Poslato: {submittedCount}/{items.length}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Izvestaji po volonterima</Text>

          {items.length > 0 ? (
            <View style={styles.items}>
              {items.map(item => (
                <View key={item.volunteer.id} style={styles.reportItem}>
                  <Text style={styles.volunteerName}>
                    {formatVolunteerName(item.volunteer)}
                  </Text>
                  <Text style={styles.volunteerMeta}>{item.volunteer.email}</Text>

                  {item.assignment.reportSubmittedAt ? (
                    <>
                      <Text style={styles.reportStatusSubmitted}>
                        Izvestaj je poslat
                      </Text>
                      <Text style={styles.reportComment}>
                        {item.assignment.volunteerComment || 'Komentar nije dodat.'}
                      </Text>

                      {item.reportPhotos.length > 0 ? (
                        <View style={styles.photoGrid}>
                          {item.reportPhotos.map(photo => (
                            <View key={photo.id} style={styles.photoCard}>
                              <Pressable onPress={() => Linking.openURL(photo.url)}>
                                <Image source={{ uri: photo.url }} style={styles.photo} />
                              </Pressable>

                              <View style={styles.photoActions}>
                                <Pressable
                                  style={styles.photoActionButton}
                                  onPress={() => Linking.openURL(photo.url)}
                                >
                                  <Ionicons
                                    name="open-outline"
                                    size={16}
                                    color={Colors.primary}
                                  />
                                  <Text style={styles.photoActionText}>Otvori</Text>
                                </Pressable>

                                <Pressable
                                  style={styles.photoActionButton}
                                  onPress={() => Linking.openURL(buildDownloadUrl(photo.url))}
                                >
                                  <Ionicons
                                    name="download-outline"
                                    size={16}
                                    color={Colors.primary}
                                  />
                                  <Text style={styles.photoActionText}>Preuzmi</Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyReportText}>
                          Fotografije nisu dodate.
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.emptyReportText}>
                      Izvestaj jos nije poslat.
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Nema clanova konacnog tima.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatVolunteerName(volunteer: AppUser) {
  return `${volunteer.firstName} ${volunteer.lastName}`;
}

function buildDownloadUrl(url: string) {
  const marker = '/upload/';

  if (!url.includes(marker)) {
    return url;
  }

  return url.replace(marker, '/upload/fl_attachment/');
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 10,
    backgroundColor: '#E7F8EF',
    padding: Spacing.md,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B7F46',
  },
  summaryText: {
    fontSize: 13,
    color: '#1B7F46',
    marginTop: 2,
  },
  section: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  items: {
    gap: Spacing.sm,
  },
  reportItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  volunteerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  volunteerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reportStatusSubmitted: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B7F46',
    marginTop: Spacing.sm,
  },
  reportComment: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyReportText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  photoCard: {
    width: 96,
    gap: Spacing.xs,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  photoActions: {
    gap: Spacing.xs,
  },
  photoActionButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.xs,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
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
