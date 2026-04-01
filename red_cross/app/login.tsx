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

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Greška', 'Unesite email i lozinku.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error: any) {
      console.log(error);
      Alert.alert('Greška', 'Prijava nije uspela: ' + error.message);
    } finally {
      setLoading(false);
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