import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Assignment } from '@/models/Assignment';
import { ExternalActivity } from '@/models/Activity';
import { Invitation, InvitationResponseStatus } from '@/models/Invitation';
import { Photo } from '@/models/Photo';
import { AppUser } from '@/models/User';
import {
  assignVolunteer,
  cancelVolunteerAssignment,
  getActivityAssignments,
} from '@/services/assignmentService';
import {
  getAssignmentPhotos,
  getPhotoDownloadUrl,
} from '@/services/activityReportService';
import { getActivityById } from '@/services/activityService';
import { getActivityInvitations } from '@/services/invitationService';
import { getAllUsers } from '@/services/userService';

type InvitationListItem = {
  invitation: Invitation;
  volunteer: AppUser;
  assignment?: Assignment;
  reportPhotos: ReportPhoto[];
};

export default function ActivityResponsesScreen() {
  const { appUser } = useAuth();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<ExternalActivity | null>(null);
  const [items, setItems] = useState<InvitationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingVolunteerId, setSavingVolunteerId] = useState<string | null>(
    null
  );
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activityId, appUser?.id]);

  const loadData = async () => {
    if (!activityId || !appUser?.id) {
      setError('Aktivnost nije pronađena.');
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
        setError('Nemate dozvolu za pregled odgovora za ovu aktivnost.');
        return;
      }

      const [loadedInvitations, loadedAssignments, loadedUsers] =
        await Promise.all([
          getActivityInvitations(activityId),
          getActivityAssignments(activityId),
          getAllUsers(),
        ]);
      const usersById = new Map(loadedUsers.map(user => [user.id, user]));
      const assignmentsByVolunteerId = new Map(
        loadedAssignments.map(assignment => [
          assignment.volunteerId,
          assignment,
        ])
      );
      const photosByVolunteerId = new Map(
        await Promise.all(
          loadedAssignments.map(async assignment => [
            assignment.volunteerId,
            await loadReportPhotos(
              await getAssignmentPhotos(activityId, assignment.volunteerId)
            ),
          ] as const)
        )
      );

      const loadedItems: InvitationListItem[] = [];

      loadedInvitations.forEach(invitation => {
        const volunteer = usersById.get(invitation.volunteerId);

        if (!volunteer) {
          return;
        }

        loadedItems.push({
          invitation,
          volunteer,
          assignment: assignmentsByVolunteerId.get(invitation.volunteerId),
          reportPhotos: photosByVolunteerId.get(invitation.volunteerId) ?? [],
        });
      });

      setActivity(loadedActivity);
      setItems(
        loadedItems.sort((first, second) =>
          formatVolunteerName(first.volunteer).localeCompare(
            formatVolunteerName(second.volunteer)
          )
        )
      );
    } catch (loadError) {
      console.error('Error loading activity invitation responses:', loadError);
      setError('Došlo je do greške prilikom učitavanja odgovora.');
    } finally {
      setLoading(false);
    }
  };

  const assignedItems = useMemo(
    () => items.filter(item => item.assignment?.status === 'ASSIGNED'),
    [items]
  );
  const acceptedItems = useMemo(
    () =>
      items.filter(
        item =>
          item.invitation.response === 'ACCEPTED' &&
          item.assignment?.status !== 'ASSIGNED'
      ),
    [items]
  );
  const pendingItems = useMemo(
    () => items.filter(item => item.invitation.response === 'PENDING'),
    [items]
  );
  const declinedItems = useMemo(
    () => items.filter(item => item.invitation.response === 'DECLINED'),
    [items]
  );
  const canManageTeam = !hasActivityStarted(activity);
  const canViewReports = hasActivityEnded(activity);

  const handleAssignVolunteer = (item: InvitationListItem) => {
    if (!canManageTeam || hasActivityStarted(activity)) {
      Alert.alert(
        'Tim je zaključan',
        'Konačni tim nije moguće menjati nakon početka aktivnosti.'
      );
      return;
    }

    Alert.alert(
      'Dodavanje u tim',
      `Da li želite da dodate volontera ${formatVolunteerName(
        item.volunteer
      )} u konačni tim?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Dodaj',
          onPress: async () => {
            try {
              setSavingVolunteerId(item.volunteer.id);
              await assignVolunteer(activityId!, item.volunteer.id);
              await loadData();
            } catch (saveError) {
              console.error('Error assigning volunteer:', saveError);
              Alert.alert('Greška', 'Nije moguće dodati volontera u tim.');
            } finally {
              setSavingVolunteerId(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelAssignment = (item: InvitationListItem) => {
    if (!canManageTeam || hasActivityStarted(activity)) {
      Alert.alert(
        'Tim je zaključan',
        'Konačni tim nije moguće menjati nakon početka aktivnosti.'
      );
      return;
    }

    Alert.alert(
      'Uklanjanje iz tima',
      `Da li želite da uklonite volontera ${formatVolunteerName(
        item.volunteer
      )} iz konačnog tima?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Ukloni',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingVolunteerId(item.volunteer.id);
              await cancelVolunteerAssignment(activityId!, item.volunteer.id);
              await loadData();
            } catch (saveError) {
              console.error('Error cancelling volunteer assignment:', saveError);
              Alert.alert('Greška', 'Nije moguće ukloniti volontera iz tima.');
            } finally {
              setSavingVolunteerId(null);
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

        <View>
          <Text style={styles.title}>Odgovori volontera</Text>
          <Text style={styles.subtitle}>{activity.title}</Text>
        </View>

        {!canManageTeam ? (
          <View style={styles.readOnlyInfo}>
            <Text style={styles.readOnlyInfoText}>
              Aktivnost je počela. Konačni tim je zaključan i dostupan samo za
              pregled.
            </Text>
          </View>
        ) : null}

        <ResponseSection
          title={`Konačni tim (${assignedItems.length})`}
          emptyText="Još uvek nema potvrđenih članova tima."
          items={assignedItems}
          savingVolunteerId={savingVolunteerId}
          actionLabel={canManageTeam ? 'Ukloni iz tima' : undefined}
          destructive={canManageTeam}
          onAction={canManageTeam ? handleCancelAssignment : undefined}
        />

        <ResponseSection
          title={`Prihvatili (${acceptedItems.length})`}
          emptyText="Nema volontera koji čekaju dodavanje u tim."
          items={acceptedItems}
          savingVolunteerId={savingVolunteerId}
          actionLabel={canManageTeam ? 'Dodaj u tim' : undefined}
          onAction={canManageTeam ? handleAssignVolunteer : undefined}
        />

        <ResponseSection
          title={`Čekaju odgovor (${pendingItems.length})`}
          emptyText="Nema poziva koji čekaju odgovor."
          items={pendingItems}
          savingVolunteerId={savingVolunteerId}
        />

        <ResponseSection
          title={`Odbili (${declinedItems.length})`}
          emptyText="Nema odbijenih poziva."
          items={declinedItems}
          savingVolunteerId={savingVolunteerId}
        />

        {canViewReports ? <ReportSection items={assignedItems} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type ReportPhoto = Photo & {
  url: string;
};

function ReportSection({ items }: { items: InvitationListItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Izveštaji sa aktivnosti</Text>

      {items.length > 0 ? (
        <View style={styles.items}>
          {items.map(item => (
            <View key={item.volunteer.id} style={styles.reportItem}>
              <Text style={styles.volunteerName}>
                {formatVolunteerName(item.volunteer)}
              </Text>

              {item.assignment?.reportSubmittedAt ? (
                <>
                  <Text style={styles.reportStatusSubmitted}>
                    Izveštaj je poslat
                  </Text>
                  <Text style={styles.reportComment}>
                    {item.assignment.volunteerComment ||
                      'Komentar nije dodat.'}
                  </Text>

                  {item.reportPhotos.length > 0 ? (
                    <View style={styles.photoGrid}>
                      {item.reportPhotos.map(photo => (
                        <Pressable
                          key={photo.id}
                          onPress={() => Linking.openURL(photo.url)}
                        >
                          <Image source={{ uri: photo.url }} style={styles.photo} />
                        </Pressable>
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
                  Izveštaj još nije poslat.
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>Nema članova konačnog tima.</Text>
      )}
    </View>
  );
}

function ResponseSection({
  title,
  emptyText,
  items,
  savingVolunteerId,
  actionLabel,
  destructive = false,
  onAction,
}: {
  title: string;
  emptyText: string;
  items: InvitationListItem[];
  savingVolunteerId: string | null;
  actionLabel?: string;
  destructive?: boolean;
  onAction?: (item: InvitationListItem) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {items.length > 0 ? (
        <View style={styles.items}>
          {items.map(item => (
            <View key={item.volunteer.id} style={styles.item}>
              <View style={styles.itemInfo}>
                <Text style={styles.volunteerName}>
                  {formatVolunteerName(item.volunteer)}
                </Text>
                <Text style={styles.volunteerMeta}>{item.volunteer.email}</Text>
                {item.invitation.response === 'DECLINED' &&
                item.invitation.responseMessage ? (
                  <Text style={styles.responseMessage}>
                    Poruka: {item.invitation.responseMessage}
                  </Text>
                ) : null}
              </View>

              {actionLabel && onAction ? (
                <Pressable
                  style={[
                    styles.actionButton,
                    destructive ? styles.destructiveActionButton : null,
                  ]}
                  disabled={savingVolunteerId === item.volunteer.id}
                  onPress={() => onAction(item)}
                >
                  {savingVolunteerId === item.volunteer.id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.actionButtonText}>{actionLabel}</Text>
                  )}
                </Pressable>
              ) : (
                <StatusBadge response={item.invitation.response} />
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{emptyText}</Text>
      )}
    </View>
  );
}

function StatusBadge({ response }: { response: InvitationResponseStatus }) {
  const content = {
    PENDING: {
      label: 'Čeka odgovor',
      badgeStyle: styles.pendingBadge,
      textStyle: styles.pendingText,
    },
    ACCEPTED: {
      label: 'Prihvatio/la',
      badgeStyle: styles.acceptedBadge,
      textStyle: styles.acceptedText,
    },
    DECLINED: {
      label: 'Odbio/la',
      badgeStyle: styles.declinedBadge,
      textStyle: styles.declinedText,
    },
  }[response];

  return (
    <View style={[styles.statusBadge, content.badgeStyle]}>
      <Text style={[styles.statusText, content.textStyle]}>{content.label}</Text>
    </View>
  );
}

function formatVolunteerName(volunteer: AppUser) {
  return `${volunteer.firstName} ${volunteer.lastName}`;
}

function hasActivityStarted(activity: ExternalActivity | null) {
  if (!activity) {
    return false;
  }

  const startDate = new Date(activity.startDateTime);

  return Number.isNaN(startDate.getTime()) || new Date() >= startDate;
}

function hasActivityEnded(activity: ExternalActivity | null) {
  if (!activity) {
    return false;
  }

  const endDate = new Date(activity.endDateTime);

  return !Number.isNaN(endDate.getTime()) && new Date() >= endDate;
}

async function loadReportPhotos(photos: Photo[]): Promise<ReportPhoto[]> {
  return Promise.all(
    photos.map(async photo => ({
      ...photo,
      url: await getPhotoDownloadUrl(photo.path),
    }))
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
  readOnlyInfo: {
    borderRadius: 8,
    backgroundColor: '#FFF4E5',
    padding: Spacing.sm,
  },
  readOnlyInfoText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#B54708',
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  itemInfo: {
    flex: 1,
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
  responseMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  reportItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  reportStatusSubmitted: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B7F46',
    marginTop: 2,
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
    marginTop: Spacing.xs,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  actionButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
  },
  destructiveActionButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#FFF4E5',
  },
  pendingText: {
    color: '#B54708',
  },
  acceptedBadge: {
    backgroundColor: '#E7F8EF',
  },
  acceptedText: {
    color: '#1B7F46',
  },
  declinedBadge: {
    backgroundColor: Colors.primaryLight,
  },
  declinedText: {
    color: Colors.error,
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
});
