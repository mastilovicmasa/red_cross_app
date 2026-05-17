import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderIconButton } from '@/components/common/HeaderIconButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Competency, Program } from '@/models/Competency';
import {
  createCompetency,
  getAllCompetencies,
  updateCompetency,
} from '@/services/competencyService';

const programs: Program[] = [
  'FIRST_AID',
  'PHV',
  'DRR',
  'ANTITRAFFICKING',
  'HEALTH',
  'LIFESAVING',
  'DUN',
];

export function CompetencyManagementScreen() {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program>('FIRST_AID');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [formProgram, setFormProgram] = useState<Program>('FIRST_AID');
  const [level, setLevel] = useState('');

  useEffect(() => {
    loadCompetencies();
  }, []);

  const loadCompetencies = async () => {
    const data = await getAllCompetencies();
    setCompetencies(data);
  };

  const filteredCompetencies = useMemo(() => {
    return competencies
      .filter(competency => competency.program === selectedProgram)
      .sort((a, b) => a.level.localeCompare(b.level));
  }, [competencies, selectedProgram]);

  const openCreateModal = () => {
    setEditingCompetency(null);
    setFormProgram(selectedProgram);
    setLevel('');
    setModalVisible(true);
  };

  const openEditModal = (competency: Competency) => {
    setEditingCompetency(competency);
    setFormProgram(competency.program);
    setLevel(competency.level);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCompetency(null);
    setFormProgram(selectedProgram);
    setLevel('');
  };

  const handleSave = async () => {
    const trimmedLevel = level.trim();

    if (!trimmedLevel) {
      Alert.alert('Greška', 'Unesite naziv nivoa kompetencije.');
      return;
    }

    if (editingCompetency) {
      const normalizedNewId = generateCompetencyId(
        editingCompetency.program,
        trimmedLevel
      );

      const competencyExists = competencies.some(
        competency =>
          competency.id !== editingCompetency.id &&
          competency.id === normalizedNewId
      );

      if (competencyExists) {
        Alert.alert('Greška', 'Kompetencija sa ovim programom i nivoom već postoji.');
        return;
      }

      await updateCompetency(editingCompetency.id, {
        level: trimmedLevel,
      });
    } else {
      const newCompetencyId = generateCompetencyId(formProgram, trimmedLevel);

      const competencyExists = competencies.some(
        competency => competency.id === newCompetencyId
      );

      if (competencyExists) {
        Alert.alert('Greška', 'Kompetencija sa ovim programom i nivoom već postoji.');
        return;
      }

      const newCompetency: Competency = {
        id: newCompetencyId,
        program: formProgram,
        level: trimmedLevel,
        isActive: true,
      };

      await createCompetency(newCompetency);
      setSelectedProgram(formProgram);
    }

    closeModal();
    await loadCompetencies();
  };

  const handleToggleStatus = (competency: Competency) => {
    const isActive = competency.isActive !== false;
    const nextStatus = !isActive;

    Alert.alert(
      nextStatus ? 'Reaktivacija kompetencije' : 'Deaktivacija kompetencije',
      `Da li želite da ${nextStatus ? 'reaktivirate' : 'deaktivirate'} kompetenciju "${formatProgram(competency.program)} - ${competency.level}"?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: nextStatus ? 'Reaktiviraj' : 'Deaktiviraj',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            await updateCompetency(competency.id, {
              isActive: nextStatus,
            });
            await loadCompetencies();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCompetency ? 'Izmena kompetencije' : 'Nova kompetencija'}
            </Text>

            <Text style={styles.inputLabel}>Program</Text>

            {editingCompetency ? (
              <View style={styles.readOnlyProgramBox}>
                <Text style={styles.readOnlyProgramText}>
                  {formatProgram(editingCompetency.program)}
                </Text>
              </View>
            ) : (
              <View style={styles.programOptions}>
                {programs.map(program => (
                  <Pressable
                    key={program}
                    style={[
                      styles.programOption,
                      formProgram === program && styles.selectedProgramOption,
                    ]}
                    onPress={() => setFormProgram(program)}
                  >
                    <Text
                      style={[
                        styles.programOptionText,
                        formProgram === program && styles.selectedProgramOptionText,
                      ]}
                    >
                      {formatProgram(program)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>Nivo</Text>

            <TextInput
              value={level}
              onChangeText={setLevel}
              placeholder="Unesite naziv nivoa"
              style={styles.input}
              placeholderTextColor={Colors.textSecondary}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Odustani</Text>
              </Pressable>

              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Sačuvaj</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Kompetencije</Text>
            <Text style={styles.subtitle}>
              Upravljanje kompetencijama u sistemu
            </Text>
          </View>

          <HeaderIconButton iconName="add" onPress={openCreateModal} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.programTabs}
        >
          {programs.map(program => (
            <Pressable
              key={program}
              style={[
                styles.programTab,
                selectedProgram === program && styles.selectedProgramTab,
              ]}
              onPress={() => setSelectedProgram(program)}
            >
              <Text
                style={[
                  styles.programTabText,
                  selectedProgram === program && styles.selectedProgramTabText,
                ]}
              >
                {formatProgram(program)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          {formatProgram(selectedProgram)}
        </Text>

        {filteredCompetencies.map(competency => {
          const isActive = competency.isActive !== false;

          return (
            <View key={competency.id} style={styles.competencyCard}>
              <View style={styles.competencyHeader}>
                <View style={styles.competencyInfo}>
                  <Text style={styles.competencyLevel}>
                    {competency.level}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isActive ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isActive ? styles.activeText : styles.inactiveText,
                    ]}
                  >
                    {isActive ? 'Aktivna' : 'Neaktivna'}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => openEditModal(competency)}
                >
                  <Text style={styles.editButtonText}>Izmeni</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.statusButton,
                    !isActive && styles.reactivateButton,
                  ]}
                  onPress={() => handleToggleStatus(competency)}
                >
                  <Text style={styles.statusButtonText}>
                    {isActive ? 'Deaktiviraj' : 'Reaktiviraj'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {filteredCompetencies.length === 0 && (
          <Text style={styles.emptyText}>
            Nema unetih kompetencija za izabrani program.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function generateCompetencyId(program: Program, level: string) {
  return `${program.toLowerCase()}_${normalizeForId(level)}`;
}

function normalizeForId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[đ]/g, 'dj')
    .replace(/[ž]/g, 'z')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatProgram(program: string) {
  switch (program) {
    case 'FIRST_AID':
      return 'Prva pomoć';
    case 'PHV':
      return 'PHV';
    case 'DRR':
      return 'DRR';
    case 'ANTITRAFFICKING':
      return 'Antitrafficking';
    case 'HEALTH':
      return 'Zdravlje';
    case 'LIFESAVING':
      return 'Spasilaštvo';
    case 'DUN':
      return 'DUN';
    default:
      return program;
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  competencyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  competencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  competencyInfo: {
    flex: 1,
  },
  competencyProgram: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  competencyLevel: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  activeBadge: {
    backgroundColor: '#E7F8EF',
  },
  inactiveBadge: {
    backgroundColor: '#FDECEC',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#1B7F46',
  },
  inactiveText: {
    color: '#B42318',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#B42318',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reactivateButton: {
    backgroundColor: '#1B7F46',
  },
  statusButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  programOptions: {
    gap: Spacing.sm,
  },
  programOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  selectedProgramOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  disabledProgramOption: {
    opacity: 0.7,
  },
  programOptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  selectedProgramOptionText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  sectionTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: Colors.textPrimary,
  marginBottom: Spacing.md,
  },
    programTabs: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    },
    programTab: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    },
    selectedProgramTab: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    },
    programTabText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
    },
    selectedProgramTabText: {
    color: Colors.primary,
    fontWeight: '700',
    },
    competencyId: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    },
    readOnlyProgramBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    },
    readOnlyProgramText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    },
});
