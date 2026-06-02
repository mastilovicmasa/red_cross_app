import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { Photo } from '@/models/Photo';
import {
  getAssignmentPhotos,
  getPhotoDownloadUrl,
  saveActivityReport,
} from '@/services/activityReportService';
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
  const [comment, setComment] = useState('');
  const [savedPhotos, setSavedPhotos] = useState<ReportPhoto[]>([]);
  const [newPhotoUris, setNewPhotoUris] = useState<string[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
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
      const [loadedActivity, loadedAssignment, loadedPhotos] = await Promise.all([
        getActivityById(activityId),
        getVolunteerAssignment(activityId, appUser.id),
        getAssignmentPhotos(activityId, appUser.id),
      ]);

      if (!loadedActivity || !loadedAssignment) {
        setError('Aktivnost nije pronađena.');
        return;
      }

      setActivity(loadedActivity);
      setAssignment(loadedAssignment);
      setComment(loadedAssignment.volunteerComment ?? '');
      setRemovedPhotos([]);
      setNewPhotoUris([]);
      setSavedPhotos(await loadReportPhotos(loadedPhotos));
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

  const canEditReport =
    assignment.status === 'ASSIGNED' && hasActivityEnded(activity);
  const visibleSavedPhotos = savedPhotos.filter(
    photo => !removedPhotos.some(removedPhoto => removedPhoto.id === photo.id)
  );
  const photoCount = visibleSavedPhotos.length + newPhotoUris.length;

  const handleAddPhotos = async () => {
    const remainingPhotoCount = 4 - photoCount;

    if (remainingPhotoCount <= 0) {
      Alert.alert('Ograničenje', 'Možete dodati najviše četiri fotografije.');
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Dozvola je potrebna',
        'Omogućite pristup galeriji kako biste dodali fotografije.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingPhotoCount,
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPhotoUris(currentUris => [
        ...currentUris,
        ...result.assets
          .slice(0, remainingPhotoCount)
          .map(asset => asset.uri),
      ]);
    }
  };

  const handleSaveReport = async () => {
    if (!appUser?.id) {
      return;
    }

    try {
      setSavingReport(true);
      await saveActivityReport({
        activityId: activity.id,
        volunteerId: appUser.id,
        volunteerComment: comment,
        newPhotoUris,
        removedPhotos,
      });
      await loadData();
      Alert.alert('Uspešno', 'Izveštaj je sačuvan.');
    } catch (saveError) {
      console.error('Error saving activity report:', saveError);
      Alert.alert('Greška', 'Nije moguće sačuvati izveštaj.');
    } finally {
      setSavingReport(false);
    }
  };

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

        {canEditReport ? (
          <View style={styles.section}>
            <Text style={styles.reportTitle}>Izveštaj sa aktivnosti</Text>
            <Text style={styles.reportDescription}>
              Dodajte kratak komentar i najviše četiri fotografije.
            </Text>

            <Text style={styles.inputLabel}>Komentar</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Kratak opis realizacije..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              textAlignVertical="top"
              style={styles.commentInput}
            />

            <View style={styles.photoHeader}>
              <Text style={styles.inputLabel}>Fotografije ({photoCount}/4)</Text>
              <Pressable
                style={styles.addPhotoButton}
                onPress={handleAddPhotos}
                disabled={photoCount >= 4 || savingReport}
              >
                <Text style={styles.addPhotoButtonText}>+ Dodaj</Text>
              </Pressable>
            </View>

            {photoCount > 0 ? (
              <View style={styles.photoGrid}>
                {visibleSavedPhotos.map(photo => (
                  <PhotoPreview
                    key={photo.id}
                    uri={photo.url}
                    onRemove={() =>
                      setRemovedPhotos(currentPhotos => [
                        ...currentPhotos,
                        photo,
                      ])
                    }
                  />
                ))}
                {newPhotoUris.map(uri => (
                  <PhotoPreview
                    key={uri}
                    uri={uri}
                    onRemove={() =>
                      setNewPhotoUris(currentUris =>
                        currentUris.filter(currentUri => currentUri !== uri)
                      )
                    }
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyPhotosText}>
                Nema dodatih fotografija.
              </Text>
            )}

            <View style={styles.saveReportAction}>
              <CustomButton
                title="Sačuvaj izveštaj"
                onPress={handleSaveReport}
                loading={savingReport}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type ReportPhoto = Photo & {
  url: string;
};

function PhotoPreview({
  uri,
  onRemove,
}: {
  uri: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.photoPreview}>
      <Image source={{ uri }} style={styles.photoImage} />
      <Pressable style={styles.removePhotoButton} onPress={onRemove}>
        <Text style={styles.removePhotoButtonText}>×</Text>
      </Pressable>
    </View>
  );
}

async function loadReportPhotos(photos: Photo[]): Promise<ReportPhoto[]> {
  return Promise.all(
    photos.map(async photo => ({
      ...photo,
      url: await getPhotoDownloadUrl(photo.path),
    }))
  );
}

function hasActivityEnded(activity: Activity) {
  const endDate = new Date(activity.endDateTime);

  return !Number.isNaN(endDate.getTime()) && new Date() >= endDate;
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
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reportDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  commentInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  addPhotoButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  addPhotoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  photoPreview: {
    position: 'relative',
  },
  photoImage: {
    width: 84,
    height: 84,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: Colors.error,
  },
  removePhotoButtonText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyPhotosText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  saveReportAction: {
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
