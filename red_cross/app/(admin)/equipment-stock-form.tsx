import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { EquipmentStock, EquipmentType } from '@/models/Equipment';
import { createEquipmentStock } from '@/services/equipmentStockService';
import { getAllEquipmentTypes } from '@/services/equipmentTypeService';

export default function EquipmentStockFormScreen() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [size, setSize] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      resetForm();
      loadEquipmentTypes();
    }, [])
  );

  const resetForm = () => {
    setEquipmentTypeId('');
    setSize('');
    setTotalQuantity('');
    setTypeModalVisible(false);
  };

  const loadEquipmentTypes = async () => {
    try {
      const data = await getAllEquipmentTypes();
      setEquipmentTypes(data);
      setEquipmentTypeId(currentValue =>
        currentValue || (data.length > 0 ? data[0].id : '')
      );
    } catch (error) {
      console.error('Error loading equipment types:', error);
      Alert.alert('Greška', 'Nije moguće učitati tipove opreme.');
    } finally {
      setLoadingTypes(false);
    }
  };

  const selectedEquipmentType = useMemo(
    () => equipmentTypes.find(item => item.id === equipmentTypeId) ?? null,
    [equipmentTypeId, equipmentTypes]
  );

  const handleSave = async () => {
    if (!selectedEquipmentType) {
      Alert.alert('Greška', 'Najpre dodajte tip opreme.');
      return;
    }

    const parsedTotalQuantity = Number.parseInt(totalQuantity, 10);

    if (!Number.isFinite(parsedTotalQuantity) || parsedTotalQuantity <= 0) {
      Alert.alert('Greška', 'Ukupna količina mora biti pozitivan ceo broj.');
      return;
    }

    const normalizedSize = size.trim().toUpperCase();
    const resolvedQrToken = generateEquipmentStockQrToken(
      selectedEquipmentType.name,
      normalizedSize
    );
    const stockId = generateEquipmentStockId(
      selectedEquipmentType.id,
      normalizedSize
    );

    const equipmentStock: EquipmentStock = {
      id: stockId,
      equipmentTypeId: selectedEquipmentType.id,
      size: normalizedSize || undefined,
      totalQuantity: parsedTotalQuantity,
      availableQuantity: parsedTotalQuantity,
      qrToken: resolvedQrToken,
    };

    try {
      setLoading(true);
      await createEquipmentStock(equipmentStock);
      Alert.alert('Uspešno', 'Lager stavka je sačuvana.', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            router.replace('/(admin)/equipment' as any);
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating equipment stock:', error);
      Alert.alert(
        'Greška',
        error instanceof Error
          ? error.message
          : 'Nije moguće sačuvati lager stavku.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Modal
        visible={typeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Izaberite tip opreme</Text>

            <View style={styles.modalOptionList}>
              {equipmentTypes.map(option => (
                <Pressable
                  key={option.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setEquipmentTypeId(option.id);
                    setTypeModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionTitle}>{option.name}</Text>
                  <Text style={styles.modalOptionSubtitle}>
                    {formatCategory(option.category)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <CustomButton
              title="Zatvori"
              onPress={() => setTypeModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.replace('/(admin)/equipment' as any)} />
        <Text style={styles.title}>Nova lager stavka</Text>
        <Text style={styles.description}>
          Lager stavka predstavlja konkretan tip opreme i veličinu koju će
          zaposleni kasnije izdavati volonterima.
        </Text>

        <Text style={styles.sectionLabel}>Tip opreme</Text>
        {loadingTypes ? (
          <Text style={styles.helperText}>Učitavanje tipova opreme...</Text>
        ) : equipmentTypes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.helperText}>
              Još nema tipova opreme. Prvo dodajte tip opreme.
            </Text>
            <CustomButton
              title="Dodaj tip opreme"
              onPress={() => router.push('/(admin)/equipment-type-form' as any)}
            />
          </View>
        ) : (
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setTypeModalVisible(true)}
          >
            <View>
              <Text style={styles.dropdownValue}>
                {selectedEquipmentType?.name ?? 'Izaberite tip opreme'}
              </Text>
              {selectedEquipmentType ? (
                <Text style={styles.dropdownHint}>
                  {formatCategory(selectedEquipmentType.category)}
                </Text>
              ) : null}
            </View>
            <Ionicons
              name="chevron-down-outline"
              size={18}
              color={Colors.textSecondary}
            />
          </Pressable>
        )}

        <CustomInput
          label="Veličina"
          value={size}
          onChangeText={setSize}
          placeholder="Na primer: S, M, L"
          autoCapitalize="characters"
        />

        <CustomInput
          label="Ukupna količina"
          value={totalQuantity}
          onChangeText={setTotalQuantity}
          placeholder="Na primer: 17"
          keyboardType="number-pad"
        />

        <View style={styles.actions}>
          <CustomButton
            title="Sačuvaj lager stavku"
            onPress={handleSave}
            loading={loading}
            disabled={equipmentTypes.length === 0}
          />
          <CustomButton
            title="Odustani"
            onPress={() => {
              resetForm();
              router.replace('/(admin)/equipment' as any);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function generateEquipmentStockId(equipmentTypeId: string, size: string) {
  return [equipmentTypeId, size || 'default'].join('_');
}

function generateEquipmentStockQrToken(equipmentTypeName: string, size: string) {
  const normalizedTypeName = equipmentTypeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return ['stock', normalizedTypeName, size.toLowerCase() || 'default'].join('_');
}

function formatCategory(category: EquipmentType['category']) {
  switch (category) {
    case 'CLOTHING':
      return 'Odeća';
    case 'WORKSHOP_MATERIAL':
      return 'Radioničarski materijal';
    case 'OTHER':
      return 'Ostalo';
    default:
      return category;
  }
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
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    backgroundColor: '#FFF',
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dropdownHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  emptyBox: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actions: {
    gap: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalOptionList: {
    gap: Spacing.sm,
  },
  modalOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
