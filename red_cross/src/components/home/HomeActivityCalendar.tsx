import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Calendar,
  DateData,
  LocaleConfig,
} from 'react-native-calendars';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Activity } from '@/models/Activity';

LocaleConfig.locales.sr = {
  monthNames: [
    'Januar',
    'Februar',
    'Mart',
    'April',
    'Maj',
    'Jun',
    'Jul',
    'Avgust',
    'Septembar',
    'Oktobar',
    'Novembar',
    'Decembar',
  ],
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Maj',
    'Jun',
    'Jul',
    'Avg',
    'Sep',
    'Okt',
    'Nov',
    'Dec',
  ],
  dayNames: [
    'Nedelja',
    'Ponedeljak',
    'Utorak',
    'Sreda',
    'Cetvrtak',
    'Petak',
    'Subota',
  ],
  dayNamesShort: ['Ned', 'Pon', 'Uto', 'Sre', 'Cet', 'Pet', 'Sub'],
  today: 'Danas',
};
LocaleConfig.defaultLocale = 'sr';

type HomeActivityCalendarProps = {
  activities: Activity[];
  loading?: boolean;
  error?: string;
  title?: string;
  subtitle?: string;
  emptyMonthMessage?: string;
  emptyDayMessage?: string;
  getActivityPressHandler?: (activity: Activity) => (() => void) | undefined;
};

type CalendarMarkedDates = Record<
  string,
  {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  }
>;

const TODAY = toDateString(new Date());

export function HomeActivityCalendar({
  activities,
  loading = false,
  error = '',
  title = 'Kalendar aktivnosti',
  subtitle = 'Izaberite dan da pregledate aktivnosti.',
  emptyMonthMessage = 'Nema aktivnosti za prikaz u ovom periodu.',
  emptyDayMessage = 'Nema aktivnosti za izabrani dan.',
  getActivityPressHandler,
}: HomeActivityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [visibleMonth, setVisibleMonth] = useState(TODAY.slice(0, 7));

  useEffect(() => {
    const selectedMonth = selectedDate.slice(0, 7);

    if (selectedMonth !== visibleMonth) {
      setSelectedDate(`${visibleMonth}-01`);
    }
  }, [selectedDate, visibleMonth]);

  const activitiesByDate = useMemo(() => groupActivitiesByDate(activities), [activities]);

  const markedDates = useMemo<CalendarMarkedDates>(() => {
    const marked: CalendarMarkedDates = {};

    Object.keys(activitiesByDate).forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: Colors.primary,
      };
    });

    marked[selectedDate] = {
      ...(marked[selectedDate] ?? {}),
      selected: true,
      selectedColor: Colors.primary,
      marked: Boolean(marked[selectedDate]?.marked),
      dotColor: '#FFF',
    };

    if (!marked[TODAY]) {
      marked[TODAY] = {
        selected: false,
        marked: false,
      };
    }

    return marked;
  }, [activitiesByDate, selectedDate]);

  const selectedDayActivities = useMemo(
    () => (activitiesByDate[selectedDate] ?? []).sort(sortActivitiesByStart),
    [activitiesByDate, selectedDate]
  );

  const monthActivities = useMemo(
    () =>
      activities.filter(
        activity => toDateString(new Date(activity.startDateTime)).slice(0, 7) === visibleMonth
      ),
    [activities, visibleMonth]
  );

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <Calendar
        current={selectedDate}
        markedDates={markedDates}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        onMonthChange={(month: DateData) => {
          setVisibleMonth(month.dateString.slice(0, 7));
          setSelectedDate(month.dateString);
        }}
        enableSwipeMonths
        firstDay={1}
        theme={calendarTheme}
        style={styles.calendar}
      />

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{formatLongDate(selectedDate)}</Text>
        <Text style={styles.dayCount}>
          {selectedDayActivities.length} {selectedDayActivities.length === 1 ? 'aktivnost' : 'aktivnosti'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : monthActivities.length === 0 ? (
        <Text style={styles.emptyText}>{emptyMonthMessage}</Text>
      ) : selectedDayActivities.length === 0 ? (
        <Text style={styles.emptyText}>{emptyDayMessage}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {selectedDayActivities.map(activity => {
            const onPress = getActivityPressHandler?.(activity);

            return (
              <Pressable
                key={activity.id}
                style={({ pressed }) => [
                  styles.card,
                  pressed && onPress ? styles.cardPressed : null,
                ]}
                onPress={onPress}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {activity.title}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      activity.type === 'EXTERNAL' ? styles.externalBadge : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        activity.type === 'EXTERNAL' ? styles.externalBadgeText : null,
                      ]}
                    >
                      {activity.type === 'INTERNAL' ? 'Interna' : 'Eksterna'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {activity.location}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.infoText}>
                    {formatTimeRange(activity.startDateTime, activity.endDateTime)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function groupActivitiesByDate(activities: Activity[]) {
  return activities.reduce<Record<string, Activity[]>>((result, activity) => {
    const dateKey = toDateString(new Date(activity.startDateTime));

    if (!result[dateKey]) {
      result[dateKey] = [];
    }

    result[dateKey].push(activity);
    return result;
  }, {});
}

function sortActivitiesByStart(first: Activity, second: Activity) {
  return first.startDateTime.localeCompare(second.startDateTime);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatLongDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Izabrani dan';
  }

  return new Intl.DateTimeFormat('sr-RS', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTimeRange(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Vreme nije podešeno';
  }

  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

const calendarTheme = {
  backgroundColor: '#FFF',
  calendarBackground: '#FFF',
  textSectionTitleColor: Colors.textSecondary,
  dayTextColor: Colors.textPrimary,
  monthTextColor: Colors.textPrimary,
  arrowColor: Colors.primary,
  selectedDayBackgroundColor: Colors.primary,
  selectedDayTextColor: '#FFF',
  todayTextColor: Colors.primary,
  textDisabledColor: '#C4C4C4',
  dotColor: Colors.primary,
  selectedDotColor: '#FFF',
  textDayFontWeight: '500' as const,
  textMonthFontWeight: '700' as const,
  textDayHeaderFontWeight: '600' as const,
  textDayFontSize: 15,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 12,
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  calendar: {
    borderRadius: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  dayCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  cardsRow: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  card: {
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    padding: Spacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  externalBadge: {
    backgroundColor: '#FFF4E5',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  externalBadgeText: {
    color: '#B54708',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  stateContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
