import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      router.replace('/' as any);
    } catch (error: any) {
      console.log(error);
      Alert.alert('Greška', 'Prijava nije uspela: ' + error.message);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp(email, password);
      router.replace('/' as any);
    } catch (error: any) {
      console.log(error);
      Alert.alert('Greška', 'Registracija nije uspela: ' + error.message);
    }
  };

  return (
    <SafeAreaView>
      <View>
        <Text>Login</Text>

        <Text>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
        />

        <Button title="Sign In" onPress={handleSignIn} />
        <Button title="Sign Up" onPress={handleSignUp} />
      </View>
    </SafeAreaView>
  );
}