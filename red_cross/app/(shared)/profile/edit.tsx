import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
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

import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { globalStyles } from '@/constants/globalStyles';
import { useAuth } from '@/hooks/useAuth';
import { uploadProfileImage } from '@/services/profileImageService';
import { updateUser } from '@/services/userService';

export default function EditProfileScreen() {
  const { appUser, refreshAppUser } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState(appUser?.phoneNumber ?? '');
  const [school, setSchool] = useState(appUser?.school ?? '');
  const [profileImageUri, setProfileImageUri] = useState(
    appUser?.profileImageUrl ?? ''
  );
  const [profileImageChanged, setProfileImageChanged] = useState(false);
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

  const handlePickProfileImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Dozvola je potrebna',
        'Omogućite pristup galeriji kako biste dodali profilnu sliku.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setProfileImageUri(result.assets[0].uri);
    setProfileImageChanged(true);
  };

  const handleRemoveProfileImage = () => {
    setProfileImageUri('');
    setProfileImageChanged(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      let nextProfileImageUrl = appUser.profileImageUrl ?? '';

      if (profileImageChanged) {
        if (profileImageUri) {
          const uploadResult = await uploadProfileImage(profileImageUri, appUser.id);
          nextProfileImageUrl = uploadResult.optimizedUrl;
        } else {
          nextProfileImageUrl = '';
        }
      }

      await updateUser(appUser.id, {
        phoneNumber: phoneNumber.trim(),
        school: school.trim(),
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : '',
        profileImageUrl: nextProfileImageUrl,
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.back()} />
        <Text style={globalStyles.title}>Izmena profila</Text>

        <Text style={styles.subtitle}>
          Dopunite podatke koji se koriste za evidenciju volontera.
        </Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatarFrame}>
            <ProfileAvatar imageUrl={profileImageUri} size={112} />
            <View style={styles.avatarBadge}>
              <Ionicons name="camera-outline" size={18} color="#FFF" />
            </View>
          </View>

          <View style={styles.avatarActions}>
            <Pressable
              style={({ pressed }) => [
                styles.avatarActionButton,
                pressed ? styles.avatarActionPressed : null,
              ]}
              onPress={handlePickProfileImage}
            >
              <Text style={styles.avatarActionPrimary}>Izaberite sliku</Text>
            </Pressable>

            {profileImageUri ? (
              <Pressable
                style={({ pressed }) => [
                  styles.avatarRemoveButton,
                  pressed ? styles.avatarActionPressed : null,
                ]}
                onPress={handleRemoveProfileImage}
              >
                <Text style={styles.avatarRemoveText}>Ukloni</Text>
              </Pressable>
            ) : null}
          </View>

        </View>

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
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 15,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarFrame: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  avatarActionButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  avatarRemoveButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
  },
  avatarActionPressed: {
    opacity: 0.8,
  },
  avatarActionPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  avatarRemoveText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
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
