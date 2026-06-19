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
import { getFirebaseAuthErrorMessage } from '@/utils/firebaseAuthErrorMessage';

export default function LoginScreen() {
  const { signIn, sendResetPasswordEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Greška', 'Unesite email i lozinku.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      console.log(error);
      Alert.alert(
        'Greška',
        getFirebaseAuthErrorMessage(error, 'Prijava nije uspela.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Email je obavezan',
        'Unesite email adresu kako bismo poslali link za reset lozinke.'
      );
      return;
    }

    try {
      setResetLoading(true);
      await sendResetPasswordEmail(email.trim());
      Alert.alert(
        'Link je poslat',
        'Proverite email i pratite uputstvo za promenu lozinke.'
      );
    } catch (error) {
      Alert.alert(
        'Greška',
        getFirebaseAuthErrorMessage(
          error,
          'Slanje linka za reset lozinke nije uspelo.'
        )
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={globalStyles.screen}>
        <Text style={globalStyles.title}>Prijava</Text>

        <Text style={styles.subtitle}>
          Dobrodošli u volontersku aplikaciju Crvenog krsta Novi Sad.
        </Text>

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

        <Pressable
          onPress={handlePasswordReset}
          disabled={resetLoading}
          style={({ pressed }) => [
            styles.resetLinkWrap,
            pressed ? styles.resetLinkPressed : null,
            resetLoading ? styles.resetLinkDisabled : null,
          ]}
        >
          <Text style={styles.resetLink}>
            {resetLoading ? 'Šaljemo link...' : 'Zaboravljena lozinka?'}
          </Text>
        </Pressable>

        <CustomButton
          title="Prijavi se"
          onPress={handleSignIn}
          loading={loading}
        />

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Nemate profil?</Text>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.registerLink}> Registrujte se</Text>
          </Pressable>
        </View>
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
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  resetLinkWrap: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  resetLinkPressed: {
    opacity: 0.75,
  },
  resetLinkDisabled: {
    opacity: 0.6,
  },
  resetLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
});
