import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatePickerButton } from '@/components/activities/DatePickerButton';
import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Activity } from '@/models/Activity';
import { getActivityById, updateActivity } from '@/services/activityService';

type DateField = 'startDateTime' | 'endDateTime';

function createDefaultEndDate(startDate: Date) {
  const date = new Date(startDate);
  date.setHours(date.getHours() + 2);
  return date;
}

function createQrValidToDate(endDate: Date) {
  const date = new Date(endDate);
  date.setDate(date.getDate() + 3);
  return date;
}

export default function EditActivityScreen() {
  const { appUser } = useAuth();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(() =>
    createDefaultEndDate(new Date())
  );
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const returnToActivityDetails = () => {
    if (!activityId) {
      router.back();
      return;
    }

    router.replace({
      pathname: '/activity/[activityId]' as any,
      params: { activityId },
    });
  };

  useEffect(() => {
    loadActivity();
  }, [activityId, appUser?.id]);

  const loadActivity = async () => {
    if (!activityId) {
      setError('Aktivnost nije pronađena.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const loadedActivity = await getActivityById(activityId);

      if (!loadedActivity) {
        setError('Aktivnost nije pronađena.');
        return;
      }

      if (!canEditInternalActivity(loadedActivity, appUser?.id)) {
        setError('Nemate dozvolu za izmenu ove aktivnosti.');
        return;
      }

      setActivity(loadedActivity);
      setTitle(loadedActivity.title);
      setDescription(loadedActivity.description);
      setLocation(loadedActivity.location);
      setStartDateTime(new Date(loadedActivity.startDateTime));
      setEndDateTime(new Date(loadedActivity.endDateTime));
    } catch (loadError) {
      console.error('Error loading activity for edit:', loadError);
      setError('Došlo je do greške prilikom učitavanja aktivnosti.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activity || activity.type !== 'INTERNAL') {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle || !trimmedLocation) {
      Alert.alert('Greška', 'Popunite naziv i lokaciju aktivnosti.');
      return;
    }

    if (startDateTime <= new Date()) {
      Alert.alert('Greška', 'Aktivnost koja je počela ne može da se menja.');
      return;
    }

    if (endDateTime <= startDateTime) {
      Alert.alert('Greška', 'Datum završetka mora biti nakon datuma početka.');
      return;
    }

    try {
      setSaving(true);
      await updateActivity(activity.id, {
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        qrValidFrom: startDateTime.toISOString(),
        qrValidTo: createQrValidToDate(endDateTime).toISOString(),
      });
      router.replace({
        pathname: '/activity/[activityId]' as any,
        params: { activityId: activity.id },
      });
    } catch (saveError) {
      console.error('Error updating activity:', saveError);
      Alert.alert('Greška', 'Došlo je do greške prilikom čuvanja izmene.');
    } finally {
      setSaving(false);
    }
  };

  const updateDateField = (field: DateField, value: Date) => {
    if (field === 'startDateTime') {
      setStartDateTime(value);
      setEndDateTime(currentEndDate => {
        if (currentEndDate > value) {
          return currentEndDate;
        }

        return createDefaultEndDate(value);
      });
      return;
    }

    if (value <= startDateTime) {
      Alert.alert('Greška', 'Datum završetka mora biti nakon datuma početka.');
      setEndDateTime(createDefaultEndDate(startDateTime));
      return;
    }

    setEndDateTime(value);
  };

  const handleOpenDatePicker = (field: DateField) => {
    if (Platform.OS === 'android') {
      openAndroidDateTimePicker(field);
      return;
    }

    setActiveDateField(field);
  };

  const openAndroidDateTimePicker = (field: DateField) => {
    const currentValue =
      field === 'startDateTime' ? startDateTime : endDateTime;

    DateTimePickerAndroid.open({
      value: currentValue,
      mode: 'date',
      minimumDate: field === 'endDateTime' ? startDateTime : new Date(),
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type === 'dismissed' || !selectedDate) {
          return;
        }

        const selectedDateTime = new Date(selectedDate);
        selectedDateTime.setHours(
          currentValue.getHours(),
          currentValue.getMinutes(),
          0,
          0
        );

        DateTimePickerAndroid.open({
          value: selectedDateTime,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type === 'dismissed' || !selectedTime) {
              updateDateField(field, selectedDateTime);
              return;
            }

            const nextValue = new Date(selectedDateTime);
            nextValue.setHours(
              selectedTime.getHours(),
              selectedTime.getMinutes(),
              0,
              0
            );
            updateDateField(field, nextValue);
          },
        });
      },
    });
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (event.type === 'dismissed') {
      setActiveDateField(null);
      return;
    }

    if (!selectedDate || !activeDateField) {
      return;
    }

    updateDateField(activeDateField, selectedDate);
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

  if (error) {
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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Izmena aktivnosti</Text>
        <Text style={styles.subtitle}>
          Aktivnost možete menjati dok ne počne.
        </Text>

        <CustomInput
          label="Naziv"
          value={title}
          onChangeText={setTitle}
          placeholder="Unesite naziv aktivnosti"
        />

        <CustomInput
          label="Opis"
          value={description}
          onChangeText={setDescription}
          placeholder="Unesite kratak opis (opciono)"
          multiline
          textAlignVertical="top"
          style={styles.descriptionInput}
        />

        <CustomInput
          label="Lokacija"
          value={location}
          onChangeText={setLocation}
          placeholder="Unesite lokaciju"
        />

        <View style={styles.dateFields}>
          <DatePickerButton
            label="Početak"
            value={startDateTime}
            onPress={() => handleOpenDatePicker('startDateTime')}
          />

          <DatePickerButton
            label="Završetak"
            value={endDateTime}
            onPress={() => handleOpenDatePicker('endDateTime')}
          />
        </View>

        {Platform.OS === 'ios' && activeDateField && (
          <DateTimePicker
            value={
              activeDateField === 'startDateTime'
                ? startDateTime
                : endDateTime
            }
            mode="datetime"
            display="default"
            minimumDate={
              activeDateField === 'endDateTime' ? startDateTime : new Date()
            }
            onChange={handleDateChange}
          />
        )}

        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={returnToActivityDetails}>
            <Text style={styles.cancelButtonText}>Odustani</Text>
          </Pressable>

          <View style={styles.saveAction}>
            <CustomButton
              title="Sačuvaj"
              onPress={handleSave}
              loading={saving}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function canEditInternalActivity(activity: Activity, userId?: string) {
  if (
    activity.type !== 'INTERNAL' ||
    activity.status !== 'ACTIVE' ||
    activity.createdByUserId !== userId
  ) {
    return false;
  }

  const startDate = new Date(activity.startDateTime);

  if (Number.isNaN(startDate.getTime())) {
    return false;
  }

  return new Date() < startDate;
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
  },
  centerContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
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
    marginBottom: Spacing.lg,
  },
  descriptionInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  dateFields: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  saveAction: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
