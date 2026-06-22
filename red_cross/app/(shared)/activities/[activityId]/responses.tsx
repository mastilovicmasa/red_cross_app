import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { AppUser } from '@/models/User';
import {
  assignVolunteer,
  cancelVolunteerAssignment,
  getActivityAssignments,
} from '@/services/assignmentService';
import { getActivityById } from '@/services/activityService';
import { getActivityInvitations } from '@/services/invitationService';
import { getAllUsers } from '@/services/userService';

type InvitationListItem = {
  invitation: Invitation;
  volunteer: AppUser;
  assignment?: Assignment;
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
        (appUser.role !== 'EMPLOYEE' && appUser.role !== 'EXECUTIVE_BOARD')
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
      setError('Doslo je do greske prilikom ucitavanja odgovora.');
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

  const handleAssignVolunteer = (item: InvitationListItem) => {
    if (!canManageTeam || hasActivityStarted(activity)) {
      Alert.alert(
        'Tim je zakljucan',
        'Konacni tim nije moguce menjati nakon pocetka aktivnosti.'
      );
      return;
    }

    Alert.alert(
      'Dodavanje u tim',
      `Da li zelite da dodate volontera ${formatVolunteerName(
        item.volunteer
      )} u konacni tim?`,
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
              Alert.alert('Greska', 'Nije moguce dodati volontera u tim.');
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
        'Tim je zakljucan',
        'Konacni tim nije moguce menjati nakon pocetka aktivnosti.'
      );
      return;
    }

    Alert.alert(
      'Uklanjanje iz tima',
      `Da li zelite da uklonite volontera ${formatVolunteerName(
        item.volunteer
      )} iz konacnog tima?`,
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
              Alert.alert('Greska', 'Nije moguce ukloniti volontera iz tima.');
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
              Aktivnost je pocela. Konacni tim je zakljucan i dostupan samo za
              pregled.
            </Text>
          </View>
        ) : null}

        <ResponseSection
          title={`Konacni tim (${assignedItems.length})`}
          emptyText="Jos uvek nema potvrdjenih clanova tima."
          items={assignedItems}
          savingVolunteerId={savingVolunteerId}
          actionLabel={canManageTeam ? 'Ukloni iz tima' : undefined}
          destructive={canManageTeam}
          onAction={canManageTeam ? handleCancelAssignment : undefined}
        />

        <ResponseSection
          title={`Prihvatili (${acceptedItems.length})`}
          emptyText="Nema volontera koji cekaju dodavanje u tim."
          items={acceptedItems}
          savingVolunteerId={savingVolunteerId}
          actionLabel={canManageTeam ? 'Dodaj u tim' : undefined}
          onAction={canManageTeam ? handleAssignVolunteer : undefined}
        />

        <ResponseSection
          title={`Cekaju odgovor (${pendingItems.length})`}
          emptyText="Nema poziva koji cekaju odgovor."
          items={pendingItems}
          savingVolunteerId={savingVolunteerId}
        />

        <ResponseSection
          title={`Odbili (${declinedItems.length})`}
          emptyText="Nema odbijenih poziva."
          items={declinedItems}
          savingVolunteerId={savingVolunteerId}
        />
      </ScrollView>
    </SafeAreaView>
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
      label: 'Ceka odgovor',
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
