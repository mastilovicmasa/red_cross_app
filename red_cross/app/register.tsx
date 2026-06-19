import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { globalStyles } from '@/constants/globalStyles';
import { useAuth } from '@/hooks/useAuth';
import { Gender } from '@/models/User';
import { getFirebaseAuthErrorMessage } from '@/utils/firebaseAuthErrorMessage';

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      Alert.alert('Greška', 'Popunite sva obavezna polja.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Greška', 'Lozinka mora imati najmanje 6 karaktera.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Greška', 'Lozinke se ne poklapaju.');
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, firstName, lastName, gender);
      router.replace('/verify-email');
    } catch (error) {
      Alert.alert(
        'Greška',
        getFirebaseAuthErrorMessage(error, 'Registracija nije uspela.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={globalStyles.screen}>
        <Text style={globalStyles.title}>Registracija</Text>
        <Text style={styles.subtitle}>
          Unesite osnovne podatke za kreiranje naloga.
        </Text>

        <CustomInput
          label="Ime"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Unesite ime"
        />

        <CustomInput
          label="Prezime"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Unesite prezime"
        />

        <CustomInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Unesite email"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <CustomInput
          label="Lozinka"
          value={password}
          onChangeText={setPassword}
          placeholder="Unesite lozinku"
          secureTextEntry
        />

        <CustomInput
          label="Potvrdite lozinku"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Ponovo unesite lozinku"
          secureTextEntry
        />

        <Text style={globalStyles.label}>Pol</Text>
        <View style={styles.genderContainer}>
          <Pressable
            style={[
              styles.genderOption,
              gender === 'MALE' && styles.genderOptionSelected,
            ]}
            onPress={() => setGender('MALE')}
          >
            <Text
              style={[
                styles.genderOptionText,
                gender === 'MALE' && styles.genderOptionTextSelected,
              ]}
            >
              Muški
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.genderOption,
              gender === 'FEMALE' && styles.genderOptionSelected,
            ]}
            onPress={() => setGender('FEMALE')}
          >
            <Text
              style={[
                styles.genderOptionText,
                gender === 'FEMALE' && styles.genderOptionTextSelected,
              ]}
            >
              Ženski
            </Text>
          </Pressable>
        </View>

        <CustomButton
          title="Registruj se"
          onPress={handleRegister}
          loading={loading}
        />

        <View style={{ height: Spacing.md }} />

        <CustomButton
          title="Nazad na prijavu"
          onPress={() => router.replace('/login')}
        />
      </View>
    </SafeAreaView>
  );
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
  },
  genderContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  genderOption: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  genderOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  genderOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  genderOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
