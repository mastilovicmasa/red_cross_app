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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/activities/ActivityCard';
import { HeaderIconButton } from '@/components/common/HeaderIconButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Activity } from '@/models/Activity';
import { getAllActivities } from '@/services/activityService';

type ActivityTab = 'UPCOMING' | 'PAST' | 'ALL';

const tabLabels: Record<ActivityTab, string> = {
  UPCOMING: 'Buduće',
  PAST: 'Prošle',
  ALL: 'Sve',
};

export default function EmployeeActivitiesScreen() {
  const { appUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedTab, setSelectedTab] = useState<ActivityTab>('UPCOMING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [appUser?.id])
  );

  const loadActivities = async () => {
    if (!appUser?.id) {
      setActivities([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError('');
      const data = await getAllActivities();
      setActivities(
        data.filter(activity => activity.createdByUserId === appUser?.id)
      );
    } catch (loadError) {
      console.error('Error loading activities:', loadError);
      setError('Došlo je do greške prilikom učitavanja aktivnosti.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const handleAddActivity = () => {
    router.push('/create-activity' as any);
  };

  const filteredActivities = useMemo(() => {
    const now = new Date();
    const searchValue = search.toLowerCase().trim();

    return activities.filter(activity => {
      const endDate = new Date(activity.endDateTime);
      const matchesTab =
        selectedTab === 'ALL' ||
        (selectedTab === 'UPCOMING' && endDate >= now) ||
        (selectedTab === 'PAST' && endDate < now);

      const matchesSearch =
        activity.title.toLowerCase().includes(searchValue) ||
        activity.location.toLowerCase().includes(searchValue) ||
        activity.description.toLowerCase().includes(searchValue);

      return matchesTab && matchesSearch;
    });
  }, [activities, search, selectedTab]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        data={filteredActivities}
        keyExtractor={activity => activity.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Moje aktivnosti</Text>

              <HeaderIconButton iconName="add" onPress={handleAddActivity} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={Colors.textSecondary}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Pretraga po nazivu, opisu ili lokaciji"
                style={styles.searchInput}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

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
          <ActivityCard
            activity={item}
            onPress={() =>
              router.push({
                pathname: '/activity/[activityId]' as any,
                params: { activityId: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <Text style={styles.emptyText}>Nemate aktivnosti za prikaz.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
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
  loadingContainer: {
    paddingTop: Spacing.xl,
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
