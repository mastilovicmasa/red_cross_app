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

import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { checkInToInternalActivity } from '@/services/activityAttendanceService';

type AttendanceQrPayload = {
  type: 'INTERNAL_ACTIVITY_ATTENDANCE';
  activityId: string;
  qrToken: string;
};

export default function ScanAttendanceScreen() {
  const { appUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || !appUser) {
      return;
    }

    setScanned(true);

    const payload = parseAttendanceQrPayload(result.data);

    if (!payload) {
      showResultMessage(
        'Nevalidan QR kod',
        'Skenirani QR kod nije namenjen za evidenciju prisustva.',
        () => setScanned(false)
      );
      return;
    }

    try {
      const checkInResult = await checkInToInternalActivity(
        payload.activityId,
        appUser.id,
        payload.qrToken
      );

      if (!checkInResult.success) {
        showResultMessage('Prisustvo nije evidentirano', checkInResult.message, () =>
          setScanned(false)
        );
        return;
      }

      showResultMessage(
        'Prisustvo je evidentirano',
        'Uspešno ste evidentirali prisustvo na internoj aktivnosti.',
        () => router.back()
      );
    } catch (error) {
      console.error('Error scanning attendance QR code:', error);
      showResultMessage(
        'Greška',
        'Došlo je do greške prilikom evidentiranja prisustva.',
        () => setScanned(false)
      );
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.description}>Proverava se dozvola za kameru.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Skeniranje QR koda</Text>
          <Text style={styles.description}>
            Dozvolite pristup kameri kako biste mogli da evidentirate prisustvo.
          </Text>
          <CustomButton title="Dozvoli kameru" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Skeniraj QR kod</Text>
        <Text style={styles.description}>
          Usmerite kameru ka QR kodu interne aktivnosti.
        </Text>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
        </View>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Odustani</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function parseAttendanceQrPayload(value: string): AttendanceQrPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<AttendanceQrPayload>;

    if (
      parsed.type !== 'INTERNAL_ACTIVITY_ATTENDANCE' ||
      !parsed.activityId ||
      !parsed.qrToken
    ) {
      return null;
    }

    return {
      type: parsed.type,
      activityId: parsed.activityId,
      qrToken: parsed.qrToken,
    };
  } catch {
    return null;
  }
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
