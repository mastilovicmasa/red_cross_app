import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { Assignment } from '@/models/Assignment';
import { Activity } from '@/models/Activity';
import { Invitation, InvitationResponseStatus } from '@/models/Invitation';
import { getActivityById } from '@/services/activityService';
import { getVolunteerAssignment } from '@/services/assignmentService';
import {
  getVolunteerInvitation,
  respondToInvitation,
} from '@/services/invitationService';

const responseLabels: Record<InvitationResponseStatus, string> = {
  PENDING: 'Čeka odgovor',
  ACCEPTED: 'Prihvaćen',
  DECLINED: 'Odbijen',
};

export default function InvitationDetailsScreen() {
  const { appUser } = useAuth();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [declineMessage, setDeclineMessage] = useState('');
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activityId, appUser?.id]);

  const loadData = async () => {
    if (!activityId || !appUser?.id || appUser.role !== 'VOLUNTEER') {
      setError('Poziv nije pronađen.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [loadedActivity, loadedInvitation, loadedAssignment] = await Promise.all([
        getActivityById(activityId),
        getVolunteerInvitation(activityId, appUser.id),
        getVolunteerAssignment(activityId, appUser.id),
      ]);

      if (!loadedActivity || !loadedInvitation) {
        setError('Poziv nije pronađen.');
        return;
      }

      setActivity(loadedActivity);
      setInvitation(loadedInvitation);
      setAssignment(loadedAssignment);
      setDeclineMessage(loadedInvitation.responseMessage ?? '');
    } catch (loadError) {
      console.error('Error loading invitation details:', loadError);
      setError('Došlo je do greške prilikom učitavanja poziva.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (invitation?.response === 'ACCEPTED') {
      return;
    }

    Alert.alert(
      'Prihvatanje poziva',
      'Da li želite da prihvatite poziv za ovu aktivnost?',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Prihvati',
          onPress: () => saveResponse('ACCEPTED'),
        },
      ]
    );
  };

  const handleOpenDeclineModal = () => {
    setDeclineMessage(invitation?.responseMessage ?? '');
    setDeclineModalVisible(true);
  };

  const saveResponse = async (
    response: 'ACCEPTED' | 'DECLINED',
    responseMessage?: string
  ) => {
    if (!activityId || !appUser?.id) {
      return;
    }

    try {
      setSaving(true);
      await respondToInvitation(
        activityId,
        appUser.id,
        response,
        responseMessage?.trim()
      );
      setDeclineModalVisible(false);
      await loadData();
    } catch (saveError) {
      console.error('Error responding to invitation:', saveError);
      Alert.alert('Greška', 'Nije moguće sačuvati odgovor.');
    } finally {
      setSaving(false);
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

  if (error || !activity || !invitation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <CustomButton title="Nazad" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isAssigned = assignment?.status === 'ASSIGNED';
  const canRespond = isInvitationActive(activity) && !isAssigned;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.screenTitle}>Detalji poziva</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <Text style={styles.location}>{activity.location}</Text>

          {activity.description ? (
            <Text style={styles.description}>{activity.description}</Text>
          ) : null}

          <InfoRow label="Početak" value={formatDateTime(activity.startDateTime)} />
          <InfoRow label="Završetak" value={formatDateTime(activity.endDateTime)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vaš odgovor</Text>
          <View style={styles.responseBadge}>
            <Text style={styles.responseText}>
              {responseLabels[invitation.response]}
            </Text>
          </View>

          {invitation.response === 'DECLINED' &&
          invitation.responseMessage ? (
            <Text style={styles.responseMessage}>
              Poruka: {invitation.responseMessage}
            </Text>
          ) : null}

          {isAssigned ? (
            <View style={styles.assignmentInfo}>
              <Text style={styles.assignmentInfoTitle}>
                Potvrđeno vam je učešće na aktivnosti.
              </Text>
              <Text style={styles.assignmentInfoText}>
                U slučaju sprečenosti kontaktirajte zaposlenog.
              </Text>
            </View>
          ) : null}

          {canRespond ? (
            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.acceptButton,
                  invitation.response === 'ACCEPTED'
                    ? styles.selectedActionButton
                    : null,
                ]}
                disabled={saving}
                onPress={handleAccept}
              >
                <Text style={styles.actionButtonText}>
                  {invitation.response === 'ACCEPTED'
                    ? 'Prihvaćen poziv ✓'
                    : 'Prihvati poziv'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionButton,
                  styles.declineButton,
                  invitation.response === 'DECLINED'
                    ? styles.selectedActionButton
                    : null,
                ]}
                disabled={saving}
                onPress={handleOpenDeclineModal}
              >
                <Text style={styles.actionButtonText}>
                  {invitation.response === 'DECLINED'
                    ? 'Odbijen poziv ✓'
                    : 'Odbij poziv'}
                </Text>
              </Pressable>
            </View>
          ) : !isAssigned ? (
            <Text style={styles.inactiveText}>
              Odgovor više nije moguće promeniti jer aktivnost nije aktivna.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={declineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Odbijanje poziva</Text>
            <Text style={styles.modalDescription}>
              Možete ostaviti kratku poruku zaposlenom. Ovo polje nije obavezno.
            </Text>

            <TextInput
              value={declineMessage}
              onChangeText={setDeclineMessage}
              placeholder="Razlog odbijanja (opciono)"
              placeholderTextColor={Colors.textSecondary}
              multiline
              textAlignVertical="top"
              style={styles.messageInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                disabled={saving}
                onPress={() => setDeclineModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Odustani</Text>
              </Pressable>

              <View style={styles.modalSaveAction}>
                <CustomButton
                  title="Potvrdi"
                  loading={saving}
                  onPress={() => saveResponse('DECLINED', declineMessage)}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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

function isInvitationActive(activity: Activity) {
  const endDate = new Date(activity.endDateTime);

  return (
    activity.status === 'ACTIVE' &&
    !Number.isNaN(endDate.getTime()) &&
    endDate >= new Date()
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
  header: {
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  responseBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  responseText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  responseMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  assignmentInfo: {
    borderRadius: 8,
    backgroundColor: '#E7F8EF',
    padding: Spacing.sm,
    marginTop: Spacing.md,
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
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
  },
  acceptButton: {
    backgroundColor: '#1B7F46',
  },
  declineButton: {
    backgroundColor: Colors.error,
  },
  selectedActionButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  inactiveText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFF',
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  messageInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSaveAction: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
