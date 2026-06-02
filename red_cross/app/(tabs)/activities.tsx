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

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Assignment, AssignmentStatus } from '@/models/Assignment';
import { Activity } from '@/models/Activity';
import { getVolunteerAssignments } from '@/services/assignmentService';

type ActivityTab = 'UPCOMING' | 'PREVIOUS';
type VolunteerAssignmentItem = {
  activity: Activity;
  assignment: Assignment;
};

const tabLabels: Record<ActivityTab, string> = {
  UPCOMING: 'Predstojeće',
  PREVIOUS: 'Prethodne',
};

const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  ASSIGNED: 'Potvrđeno učešće',
  CANCELLED: 'Otkazano angažovanje',
  COMPLETED: 'Realizovano',
};

export default function ActivitiesScreen() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<VolunteerAssignmentItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<ActivityTab>('UPCOMING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [appUser?.id])
  );

  const loadAssignments = async () => {
    if (!appUser?.id) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError('');
      const loadedItems = await getVolunteerAssignments(appUser.id);
      setItems(loadedItems);
    } catch (loadError) {
      console.error('Error loading volunteer assignments:', loadError);
      setError('Došlo je do greške prilikom učitavanja aktivnosti.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const visibleItems = useMemo(
    () =>
      items.filter(item =>
        selectedTab === 'UPCOMING'
          ? isUpcomingAssignment(item)
          : !isUpcomingAssignment(item)
      ),
    [items, selectedTab]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={visibleItems}
        keyExtractor={item => item.assignment.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAssignments();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Moje aktivnosti</Text>
            <Text style={styles.subtitle}>
              Ovde se nalaze aktivnosti za koje vam je potvrđeno učešće.
            </Text>

            <View style={styles.tabs}>
              {(Object.keys(tabLabels) as ActivityTab[]).map(tab => (
                <Pressable
                  key={tab}
                  style={[
                    styles.tab,
                    selectedTab === tab ? styles.activeTab : null,
                  ]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedTab === tab ? styles.activeTabText : null,
                    ]}
                  >
                    {tabLabels[tab]}
                  </Text>
                </Pressable>
              ))}
            </View>

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
                pathname: '/volunteer-activity/[activityId]' as any,
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
                  styles.statusBadge,
                  item.assignment.status === 'CANCELLED'
                    ? styles.cancelledBadge
                    : styles.assignedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.assignment.status === 'CANCELLED'
                      ? styles.cancelledText
                      : styles.assignedText,
                  ]}
                >
                  {assignmentStatusLabels[item.assignment.status]}
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
              Nema aktivnosti u izabranoj kategoriji.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

function isUpcomingAssignment({
  activity,
  assignment,
}: VolunteerAssignmentItem) {
  const endDate = new Date(activity.endDateTime);

  return (
    assignment.status === 'ASSIGNED' &&
    activity.status !== 'CANCELLED' &&
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
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
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
  statusBadge: {
    maxWidth: 132,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  assignedBadge: {
    backgroundColor: '#E7F8EF',
  },
  assignedText: {
    color: '#1B7F46',
  },
  cancelledBadge: {
    backgroundColor: Colors.primaryLight,
  },
  cancelledText: {
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
