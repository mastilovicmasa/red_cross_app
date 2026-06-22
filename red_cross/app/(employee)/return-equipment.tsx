import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { getUserByQrToken } from '@/services/userService';

export default function ReturnEquipmentScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) {
      return;
    }

    setScanned(true);

    try {
      const user = await getUserByQrToken(result.data);

      if (!user || user.role === 'ADMIN') {
        showResultMessage(
          'Nevalidan QR kod',
          'Skenirani QR kod ne pripada korisniku kome je moguce razduziti opremu.',
          () => setScanned(false)
        );
        return;
      }

      router.replace({
        pathname: '/(employee)/equipment-volunteer/[userId]' as any,
        params: { userId: user.id },
      });
    } catch (error) {
      console.error('Error scanning volunteer QR for return:', error);
      showResultMessage(
        'Greska',
        'Doslo je do greske prilikom obrade QR koda.',
        () => setScanned(false)
      );
    }
  };

  if (!permission) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.centerContent}>
          <BackButton onPress={() => router.replace('/(employee)/equipment' as any)} />
          <Text style={styles.description}>Proverava se dozvola za kameru.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.centerContent}>
          <BackButton onPress={() => router.replace('/(employee)/equipment' as any)} />
          <Text style={styles.title}>Vrati opremu</Text>
          <Text style={styles.description}>
            Dozvolite pristup kameri kako biste mogli da skenirate QR kod volontera.
          </Text>
          <CustomButton title="Dozvoli kameru" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <BackButton onPress={() => router.replace('/(employee)/equipment' as any)} />
        <Text style={styles.title}>Skeniraj QR kod volontera</Text>
        <Text style={styles.description}>
          Nakon skeniranja otvorice se lista zaduzenja kako biste izabrali sta se
          vraca.
        </Text>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
        </View>

        <Pressable
          style={styles.cancelButton}
          onPress={() => router.replace('/(employee)/equipment' as any)}
        >
          <Text style={styles.cancelButtonText}>Odustani</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function showResultMessage(
  title: string,
  message: string,
  onPress: () => void
) {
  Alert.alert(title, message, [{ text: 'OK', onPress }], {
    cancelable: false,
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
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
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cancelButton: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
