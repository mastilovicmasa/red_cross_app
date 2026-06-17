import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeActivityCalendar } from '@/components/home/HomeActivityCalendar';
import { UsefulLinksSection } from '@/components/home/UsefulLinksSection';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Activity } from '@/models/Activity';
import { getAllActivities } from '@/services/activityService';

export default function InstructorHomeScreen() {
  const { appUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [])
  );

  const visibleActivities = useMemo(
    () =>
      activities.filter(
        activity => activity.type === 'INTERNAL' && activity.status !== 'CANCELLED'
      ),
    [activities]
  );

  const loadActivities = async () => {
    try {
      setError('');
      const loadedActivities = await getAllActivities();
      setActivities(loadedActivities);
    } catch (loadError) {
      console.error('Error loading instructor home activities:', loadError);
      setError('Došlo je do greške prilikom učitavanja aktivnosti.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadActivities();
            }}
          />
        }
      >
        <HomeActivityCalendar
          activities={visibleActivities}
          loading={loading}
          error={error}
          subtitle="Prikaz svih internih aktivnosti. Detalje možete otvoriti za aktivnosti koje ste kreirali."
          emptyMonthMessage="Nema internih aktivnosti u izabranom mesecu."
          emptyDayMessage="Za izabrani dan nema internih aktivnosti."
          getActivityPressHandler={activity =>
            activity.createdByUserId === appUser?.id
              ? () =>
                  router.push({
                    pathname: '/activity/[activityId]' as any,
                    params: { activityId: activity.id },
                  })
              : undefined
          }
        />

        <UsefulLinksSection />
      </ScrollView>
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
    gap: Spacing.lg,
  },
});
