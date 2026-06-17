import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { EquipmentCategory, EquipmentType } from '@/models/Equipment';
import { createEquipmentType } from '@/services/equipmentTypeService';

const categories: EquipmentCategory[] = [
  'CLOTHING',
  'WORKSHOP_MATERIAL',
  'OTHER',
];

export default function EquipmentTypeFormScreen() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('CLOTHING');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [])
  );

  const resetForm = () => {
    setName('');
    setCategory('CLOTHING');
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Greška', 'Unesite naziv tipa opreme.');
      return;
    }

    const equipmentType: EquipmentType = {
      id: generateEquipmentTypeId(trimmedName),
      name: trimmedName,
      category,
    };

    try {
      setLoading(true);
      await createEquipmentType(equipmentType);
      Alert.alert('Uspešno', 'Tip opreme je sačuvan.', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            router.replace('/(admin)/equipment' as any);
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating equipment type:', error);
      Alert.alert(
        'Greška',
        error instanceof Error
          ? error.message
          : 'Nije moguće sačuvati tip opreme.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Novi tip opreme</Text>
        <Text style={styles.description}>
          Tip opreme predstavlja šifarnik, na primer majica sa kragnom, duks ili
          prsluk.
        </Text>

        <CustomInput
          label="Naziv tipa opreme"
          value={name}
          onChangeText={setName}
          placeholder="Na primer: Majica sa kragnom"
        />

        <Text style={styles.sectionLabel}>Kategorija</Text>
        <View style={styles.optionList}>
          {categories.map(option => {
            const isSelected = option === category;

            return (
              <Pressable
                key={option}
                style={[
                  styles.optionCard,
                  isSelected ? styles.optionCardSelected : null,
                ]}
                onPress={() => setCategory(option)}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    isSelected ? styles.optionTitleSelected : null,
                  ]}
                >
                  {formatCategory(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <CustomButton title="Sačuvaj tip opreme" onPress={handleSave} loading={loading} />
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

function generateEquipmentTypeId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatCategory(category: EquipmentCategory) {
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
  optionList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    backgroundColor: '#FFF',
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  actions: {
    gap: Spacing.sm,
  },
});
