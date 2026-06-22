import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { EquipmentStock, EquipmentType } from '@/models/Equipment';
import {
  decreaseEquipmentStockQuantity,
  getEquipmentStockById,
  increaseEquipmentStockQuantity,
} from '@/services/equipmentStockService';
import { getEquipmentTypeById } from '@/services/equipmentTypeService';

export default function EquipmentStockAdjustScreen() {
  const { stockId } = useLocalSearchParams<{ stockId: string }>();
  const [equipmentStock, setEquipmentStock] = useState<EquipmentStock | null>(null);
  const [equipmentType, setEquipmentType] = useState<EquipmentType | null>(null);
  const [nextTotalQuantity, setNextTotalQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStock();
    }, [stockId])
  );

  const loadStock = async () => {
    if (!stockId) {
      setLoading(false);
      return;
    }

    try {
      const stock = await getEquipmentStockById(stockId);

      if (!stock) {
        Alert.alert('Greška', 'Lager stavka nije pronađena.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      setEquipmentStock(stock);
      setNextTotalQuantity(String(stock.totalQuantity));
      const type = await getEquipmentTypeById(stock.equipmentTypeId);
      setEquipmentType(type);
    } catch (error) {
      console.error('Error loading equipment stock:', error);
      Alert.alert('Greška', 'Nije moguće učitati lager stavku.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = () => {
    if (!equipmentStock) {
      return;
    }

    const parsedNextTotalQuantity = Number.parseInt(nextTotalQuantity, 10);

    if (!Number.isFinite(parsedNextTotalQuantity) || parsedNextTotalQuantity < 0) {
      Alert.alert('Greška', 'Unesite ukupan broj komada koji je nula ili veći.');
      return;
    }

    const delta = parsedNextTotalQuantity - equipmentStock.totalQuantity;

    if (delta === 0) {
      Alert.alert('Nema izmene', 'Ukupna količina je ostala ista.');
      return;
    }

    Alert.alert(
      'Korekcija lagera',
      delta > 0
        ? `Ukupno stanje će biti povećano sa ${equipmentStock.totalQuantity} na ${parsedNextTotalQuantity}.`
        : `Ukupno stanje će biti smanjeno sa ${equipmentStock.totalQuantity} na ${parsedNextTotalQuantity}.`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Sačuvaj',
          style: delta > 0 ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);

              if (delta > 0) {
                await increaseEquipmentStockQuantity(equipmentStock.id, delta);
              } else {
                await decreaseEquipmentStockQuantity(equipmentStock.id, Math.abs(delta));
              }

              Alert.alert('Uspešno', 'Stanje lagera je ažurirano.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(admin)/equipment' as any),
                },
              ]);
            } catch (error) {
              console.error('Error adjusting equipment stock:', error);
              Alert.alert(
                'Greška',
                error instanceof Error
                  ? error.message
                  : 'Nije moguće ažurirati stanje lagera.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const issuedQuantity = equipmentStock
    ? equipmentStock.totalQuantity - equipmentStock.availableQuantity
    : 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.replace('/(admin)/equipment' as any)} />
        <Text style={styles.title}>Korekcija lagera</Text>

        {loading ? (
          <Text style={styles.helperText}>Učitavanje lager stavke...</Text>
        ) : equipmentStock ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {equipmentType?.name ?? equipmentStock.equipmentTypeId}
            </Text>
            <Text style={styles.cardSubtitle}>
              {equipmentStock.size ? `Veličina ${equipmentStock.size}` : 'Bez veličine'}
            </Text>

            <View style={styles.metrics}>
              <Metric label="Ukupno" value={String(equipmentStock.totalQuantity)} />
              <Metric label="Dostupno" value={String(equipmentStock.availableQuantity)} />
              <Metric label="Izdato" value={String(issuedQuantity)} />
            </View>

            <CustomInput
              label="Novo ukupno stanje"
              value={nextTotalQuantity}
              onChangeText={setNextTotalQuantity}
              placeholder="Na primer: 25"
              keyboardType="number-pad"
            />

            <Text style={styles.helperText}>
              Ukoliko se lager smanjuje novo stanje ne može biti manji od broja trenutno izdatih stavki.
            </Text>

            <View style={styles.actions}>
              <CustomButton
                title="Sačuvaj korekciju"
                onPress={handleAdjust}
                loading={submitting}
              />
              <CustomButton
                title="Nazad"
                onPress={() => router.replace('/(admin)/equipment' as any)}
              />
            </View>
          </View>
        ) : (
          <Text style={styles.helperText}>Lager stavka nije pronađena.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  metric: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: Spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  actions: {
    gap: Spacing.sm,
  },
});
