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
import { getActiveInternalActivities } from '@/services/activityService';

export default function InstructorHomeScreen() {
  const { appUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [appUser?.id])
  );

  const visibleActivities = useMemo(() => activities, [activities]);

  const loadActivities = async () => {
    if (!appUser?.id) {
      setActivities([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError('');
      const loadedActivities = await getActiveInternalActivities();
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
                    pathname: '/(shared)/activities/[activityId]' as any,
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
