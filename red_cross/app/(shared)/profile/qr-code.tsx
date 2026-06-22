import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Brightness from 'expo-brightness';
import { useEffect, useRef } from 'react';

import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';

export default function QrCodeScreen() {
  const { appUser } = useAuth();
  const originalBrightnessRef = useRef<number | null>(null);

 useEffect(() => {
  const setMaxBrightness = async () => {
    try {
      const { status } = await Brightness.requestPermissionsAsync();

      if (status !== 'granted') return;

      const currentBrightness = await Brightness.getBrightnessAsync();
      originalBrightnessRef.current = currentBrightness;

      await Brightness.setBrightnessAsync(1);
    } catch (error) {
      console.log('Brightness error:', error);
    }
  };

  setMaxBrightness();

  return () => {
    if (originalBrightnessRef.current !== null) {
      Brightness.setBrightnessAsync(originalBrightnessRef.current);
    }
  };
}, []);

  if (!appUser) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>QR identifikacija</Text>

        <Text style={styles.subtitle}>
          Prikažite ovaj QR kod zaposlenom prilikom izdavanja ili vraćanja opreme.
        </Text>

        <View style={styles.qrContainer}>
          <QRCode
            value={appUser.qrToken}
            size={220}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
        </View>

        <Text style={styles.name}>
          {appUser.firstName} {appUser.lastName}
        </Text>

        <CustomButton title="Nazad" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  qrContainer: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderRadius: 16,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
