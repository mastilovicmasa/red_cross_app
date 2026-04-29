import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { globalStyles } from '@/constants/globalStyles';
import { useAuth } from '@/hooks/useAuth';
import { updateUser } from '@/services/userService';

export default function EditProfileScreen() {
  const { appUser, refreshAppUser } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState(appUser?.phoneNumber ?? '');
  const [school, setSchool] = useState(appUser?.school ?? '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    appUser?.dateOfBirth ? new Date(appUser.dateOfBirth) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!appUser) return null;

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') return;

    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      await updateUser(appUser.id, {
        phoneNumber: phoneNumber.trim(),
        school: school.trim(),
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : '',
      });

      await refreshAppUser();

      Alert.alert('Uspešno', 'Profil je uspešno izmenjen.');
      router.back();
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={globalStyles.screen}>
        <Text style={globalStyles.title}>Izmena profila</Text>

        <Text style={styles.subtitle}>
          Dopunite podatke koji se koriste za evidenciju volontera.
        </Text>

        <CustomInput
          label="Broj telefona"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Unesite broj telefona"
          keyboardType="phone-pad"
        />

        <Text style={globalStyles.label}>Datum rođenja</Text>
        <Pressable
          style={styles.dateInput}
          onPress={() => setShowDatePicker(true)}
        >
          <Text
            style={[
              styles.dateInputText,
              !dateOfBirth && styles.dateInputPlaceholder,
            ]}
          >
            {dateOfBirth ? formatDate(dateOfBirth) : 'Izaberite datum rođenja'}
          </Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth ?? new Date(2000, 0, 1)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        <CustomInput
          label="Škola / fakultet"
          value={school}
          onChangeText={setSchool}
          placeholder="Unesite naziv škole ili fakulteta"
        />

        <CustomButton
          title="Sačuvaj izmene"
          onPress={handleSave}
          loading={loading}
        />

        <View style={{ height: Spacing.md }} />

        <CustomButton title="Odustani" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString('sr-RS');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 15,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  dateInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: Colors.background,
    marginBottom: Spacing.md,
  },
  dateInputText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dateInputPlaceholder: {
    color: '#999',
  },
});