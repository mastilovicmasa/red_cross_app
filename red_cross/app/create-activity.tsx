import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
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
import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Activity, ActivityType } from '@/models/Activity';
import { UserRole } from '@/models/User';
import { createActivity } from '@/services/activityService';

type DateField = 'startDateTime' | 'endDateTime';

function createDefaultStartDate() {
  return new Date();
}

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

function generateQrToken(activityId: string) {
  return `${activityId}_${Math.random().toString(36).slice(2, 12)}`;
}

function getAllowedActivityTypes(role?: UserRole): ActivityType[] {
  switch (role) {
    case 'EMPLOYEE':
    case 'EXECUTIVE_BOARD':
      return ['INTERNAL', 'EXTERNAL'];
    case 'INSTRUCTOR':
      return ['INTERNAL'];
    default:
      return [];
  }
}

function getActivitiesPathForRole(role?: UserRole) {
  switch (role) {
    case 'EMPLOYEE':
      return '/(employee)/activities';
    case 'EXECUTIVE_BOARD':
      return '/(executive-board)/activities';
    case 'INSTRUCTOR':
      return '/(instructor)/activities';
    default:
      return '/';
  }
}

const activityTypeOptions: Array<{
  value: ActivityType;
  label: string;
  description: string;
}> = [
  {
    value: 'INTERNAL',
    label: 'Interna',
    description: 'Aktivnost koja se realizuje u okviru organizacije.',
  },
  {
    value: 'EXTERNAL',
    label: 'Eksterna',
    description: 'Aktivnost za koju će se naknadno birati potrebne kompetencije.',
  },
];

export default function CreateActivityScreen() {
  const { appUser, firebaseUser } = useAuth();
  const allowedActivityTypes = getAllowedActivityTypes(appUser?.role);
  const availableActivityTypeOptions = activityTypeOptions.filter(option =>
    allowedActivityTypes.includes(option.value)
  );

  const [activityType, setActivityType] = useState<ActivityType>('INTERNAL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateTime, setStartDateTime] = useState(createDefaultStartDate);
  const [endDateTime, setEndDateTime] = useState(() =>
    createDefaultEndDate(new Date())
  );
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const defaultStartDate = createDefaultStartDate();
      const defaultActivityType =
        getAllowedActivityTypes(appUser?.role)[0] ?? 'INTERNAL';

      setActivityType(defaultActivityType);
      setTitle('');
      setDescription('');
      setLocation('');
      setStartDateTime(defaultStartDate);
      setEndDateTime(createDefaultEndDate(defaultStartDate));
      setActiveDateField(null);
      setSaving(false);
    }, [appUser?.role])
  );

  const returnToActivities = () => {
    router.replace(getActivitiesPathForRole(appUser?.role) as any);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle || !trimmedLocation) {
      Alert.alert('Greška', 'Popunite naziv i lokaciju aktivnosti.');
      return;
    }

    if (endDateTime <= startDateTime) {
      Alert.alert('Greška', 'Datum završetka mora biti nakon datuma početka.');
      return;
    }

    const createdByUserId = appUser?.id ?? firebaseUser?.uid;

    if (!allowedActivityTypes.includes(activityType)) {
      Alert.alert('Greška', 'Nemate dozvolu za kreiranje ovog tipa aktivnosti.');
      return;
    }

    if (!createdByUserId) {
      Alert.alert('Greška', 'Nije moguće odrediti trenutno prijavljenog korisnika.');
      return;
    }

    const now = new Date().toISOString();
    const activityId = `activity_${Date.now()}`;

    const newActivity: Activity = {
      id: activityId,
      type: activityType,
      title: trimmedTitle,
      description: trimmedDescription,
      location: trimmedLocation,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      status: activityType === 'INTERNAL' ? 'ACTIVE' : 'DRAFT',
      createdByUserId,
      createdAt: now,
      updatedAt: now,
      ...(activityType === 'INTERNAL'
        ? {
            qrToken: generateQrToken(activityId),
            qrValidFrom: startDateTime.toISOString(),
            qrValidTo: createQrValidToDate(endDateTime).toISOString(),
          }
        : {}),
    } as Activity;

    try {
      setSaving(true);
      await createActivity(newActivity);
      returnToActivities();
    } catch (saveError) {
      console.error('Error creating activity:', saveError);
      Alert.alert('Greška', 'Došlo je do greške prilikom čuvanja aktivnosti.');
    } finally {
      setSaving(false);
    }
  };

  if (allowedActivityTypes.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.noAccessContainer}>
          <BackButton onPress={returnToActivities} />
          <Text style={styles.title}>Nova aktivnost</Text>
          <Text style={styles.noAccessText}>
            Nemate dozvolu za kreiranje aktivnosti.
          </Text>
          <CustomButton title="Nazad" onPress={returnToActivities} />
        </View>
      </SafeAreaView>
    );
  }

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
      minimumDate: field === 'endDateTime' ? startDateTime : undefined,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={returnToActivities} />
        <Text style={styles.title}>Nova aktivnost</Text>
        <Text style={styles.subtitle}>Unesite osnovne podatke o aktivnosti.</Text>

        <Text style={styles.sectionTitle}>Tip aktivnosti</Text>
        <View style={styles.typeOptions}>
          {availableActivityTypeOptions.map(option => {
            const isSelected = activityType === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  styles.typeOption,
                  isSelected ? styles.selectedTypeOption : null,
                ]}
                onPress={() => setActivityType(option.value)}
              >
                <Text
                  style={[
                    styles.typeOptionTitle,
                    isSelected ? styles.selectedTypeOptionTitle : null,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.typeOptionDescription}>
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

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

        {activityType === 'EXTERNAL' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Potrebne kompetencije i broj volontera dodaćemo u sledećem koraku.
            </Text>
          </View>
        )}

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
              activeDateField === 'endDateTime' ? startDateTime : undefined
            }
            onChange={handleDateChange}
          />
        )}

        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={returnToActivities}>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  typeOptions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: Spacing.md,
    backgroundColor: '#FFF',
  },
  selectedTypeOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  selectedTypeOptionTitle: {
    color: Colors.primary,
  },
  typeOptionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  descriptionInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  dateFields: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoBox: {
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.primary,
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
  noAccessContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  noAccessText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
});
