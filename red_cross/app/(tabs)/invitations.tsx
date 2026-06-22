import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedTabs } from '@/components/common/SegmentedTabs';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Activity } from '@/models/Activity';
import { Invitation, InvitationResponseStatus } from '@/models/Invitation';
import { getVolunteerInvitations } from '@/services/invitationService';

type InvitationTab = 'ACTIVE' | 'PREVIOUS';
type VolunteerInvitationItem = {
  activity: Activity;
  invitation: Invitation;
};

const tabLabels: Record<InvitationTab, string> = {
  ACTIVE: 'Aktivni',
  PREVIOUS: 'Prethodni',
};

const responseLabels: Record<InvitationResponseStatus, string> = {
  PENDING: 'Čeka odgovor',
  ACCEPTED: 'Prihvaćen',
  DECLINED: 'Odbijen',
};

export default function InvitationsScreen() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<VolunteerInvitationItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<InvitationTab>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadInvitations();
    }, [appUser?.id])
  );

  const loadInvitations = async () => {
    if (!appUser?.id) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError('');
      const loadedItems = await getVolunteerInvitations(appUser.id);
      setItems(loadedItems);
    } catch (loadError) {
      console.error('Error loading volunteer invitations:', loadError);
      setError('Došlo je do greške prilikom učitavanja poziva.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const visibleItems = useMemo(
    () =>
      items.filter(item =>
        selectedTab === 'ACTIVE'
          ? isActiveInvitation(item.activity)
          : !isActiveInvitation(item.activity)
      ),
    [items, selectedTab]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        data={visibleItems}
        keyExtractor={item => item.invitation.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadInvitations();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Pozivi</Text>
            <Text style={styles.subtitle}>
              Pregledajte pozive za eksterne aktivnosti i odgovorite kada budete
              spremni.
            </Text>

            <SegmentedTabs
              options={(Object.keys(tabLabels) as InvitationTab[]).map(tab => ({
                value: tab,
                label: tabLabels[tab],
              }))}
              selectedValue={selectedTab}
              onChange={setSelectedTab}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed ? styles.cardPressed : null,
            ]}
            onPress={() =>
              router.push({
                pathname: '/(shared)/activities/[activityId]/invitation' as any,
                params: { activityId: item.activity.id },
              })
            }
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>{item.activity.title}</Text>
                <Text style={styles.cardLocation}>{item.activity.location}</Text>
              </View>

              <View
                style={[
                  styles.responseBadge,
                  getResponseBadgeStyle(item.invitation.response),
                ]}
              >
                <Text
                  style={[
                    styles.responseText,
                    getResponseTextStyle(item.invitation.response),
                  ]}
                >
                  {responseLabels[item.invitation.response]}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.metaText}>
                {formatDateTime(item.activity.startDateTime)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              style={styles.loader}
              color={Colors.primary}
            />
          ) : (
            <Text style={styles.emptyText}>
              Nema poziva u izabranoj kategoriji.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

function isActiveInvitation(activity: Activity) {
  const endDate = new Date(activity.endDateTime);

  return (
    activity.status === 'ACTIVE' &&
    !Number.isNaN(endDate.getTime()) &&
    endDate >= new Date()
  );
}

function getResponseBadgeStyle(response: InvitationResponseStatus) {
  switch (response) {
    case 'ACCEPTED':
      return styles.acceptedBadge;
    case 'DECLINED':
      return styles.declinedBadge;
    default:
      return styles.pendingBadge;
  }
}

function getResponseTextStyle(response: InvitationResponseStatus) {
  switch (response) {
    case 'ACCEPTED':
      return styles.acceptedText;
    case 'DECLINED':
      return styles.declinedText;
    default:
      return styles.pendingText;
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
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  responseBadge: {
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  responseText: {
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
});
