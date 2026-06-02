import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { ActivityRequirement, ExternalActivity } from '@/models/Activity';
import { Competency } from '@/models/Competency';
import {
  createActivityRequirement,
  deleteActivityRequirement,
  getActivityRequirements,
  updateActivityRequirementCount,
} from '@/services/activityRequirementService';
import { publishExternalActivity } from '@/services/activityService';
import { getAllCompetencies } from '@/services/competencyService';

type ExternalActivityRequirementsSectionProps = {
  activity: ExternalActivity;
  canManageDraft: boolean;
  onActivityPublished: () => Promise<void>;
};

export function ExternalActivityRequirementsSection({
  activity,
  canManageDraft,
  onActivityPublished,
}: ExternalActivityRequirementsSectionProps) {
  const [requirements, setRequirements] = useState<ActivityRequirement[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRequirementId, setSavingRequirementId] = useState<string | null>(
    null
  );
  const [publishing, setPublishing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, [activity.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loadedRequirements, loadedCompetencies] = await Promise.all([
        getActivityRequirements(activity.id),
        getAllCompetencies(),
      ]);
      setRequirements(loadedRequirements);
      setCompetencies(loadedCompetencies);
    } catch (loadError) {
      console.error('Error loading external activity requirements:', loadError);
      Alert.alert('Greška', 'Nije moguće učitati poželjne kompetencije.');
    } finally {
      setLoading(false);
    }
  };

  const availableCompetencies = useMemo(() => {
    const selectedCompetencyIds = new Set(
      requirements.map(requirement => requirement.competencyId)
    );

    return competencies.filter(
      competency =>
        competency.isActive !== false &&
        !selectedCompetencyIds.has(competency.id)
    );
  }, [competencies, requirements]);

  const getCompetency = (competencyId: string) =>
    competencies.find(competency => competency.id === competencyId);

  const handleAddRequirement = async (competency: Competency) => {
    try {
      setSavingRequirementId(competency.id);
      await createActivityRequirement(activity.id, competency.id);
      setPickerVisible(false);
      await loadData();
    } catch (saveError) {
      console.error('Error adding external activity requirement:', saveError);
      Alert.alert('Greška', 'Nije moguće dodati kompetenciju.');
    } finally {
      setSavingRequirementId(null);
    }
  };

  const handleChangeCount = async (
    requirement: ActivityRequirement,
    change: number
  ) => {
    const nextCount = requirement.requiredCount + change;

    if (nextCount < 1) {
      return;
    }

    try {
      setSavingRequirementId(requirement.id);
      await updateActivityRequirementCount(
        activity.id,
        requirement.id,
        nextCount
      );
      setRequirements(currentRequirements =>
        currentRequirements.map(currentRequirement =>
          currentRequirement.id === requirement.id
            ? { ...currentRequirement, requiredCount: nextCount }
            : currentRequirement
        )
      );
    } catch (saveError) {
      console.error('Error updating external activity requirement:', saveError);
      Alert.alert('Greška', 'Nije moguće promeniti broj volontera.');
    } finally {
      setSavingRequirementId(null);
    }
  };

  const handleRemoveRequirement = (requirement: ActivityRequirement) => {
    const competency = getCompetency(requirement.competencyId);

    Alert.alert(
      'Uklanjanje kompetencije',
      `Da li želite da uklonite kompetenciju "${formatCompetency(competency)}"?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Ukloni',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingRequirementId(requirement.id);
              await deleteActivityRequirement(activity.id, requirement.id);
              setRequirements(currentRequirements =>
                currentRequirements.filter(item => item.id !== requirement.id)
              );
            } catch (deleteError) {
              console.error(
                'Error removing external activity requirement:',
                deleteError
              );
              Alert.alert('Greška', 'Nije moguće ukloniti kompetenciju.');
            } finally {
              setSavingRequirementId(null);
            }
          },
        },
      ]
    );
  };

  const handlePublish = () => {
    const message =
      requirements.length === 0
        ? 'Niste dodali poželjne kompetencije. Aktivnost ipak može da se objavi, ali sistem neće imati posebne predloge volontera. Nakon objavljivanja aktivnost više ne može da se menja.'
        : 'Nakon objavljivanja aktivnost i poželjne kompetencije više ne mogu da se menjaju.';

    Alert.alert('Objavljivanje aktivnosti', message, [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Objavi',
        onPress: async () => {
          try {
            setPublishing(true);
            await publishExternalActivity(activity.id);
            await onActivityPublished();
          } catch (publishError) {
            console.error('Error publishing external activity:', publishError);
            Alert.alert('Greška', 'Nije moguće objaviti aktivnost.');
          } finally {
            setPublishing(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Poželjne kompetencije</Text>
      <Text style={styles.sectionDescription}>
        Kompetencije služe za predlaganje adekvatnih volontera. One nisu uslov za
        učešće na aktivnosti.
      </Text>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : requirements.length > 0 ? (
        <View style={styles.requirements}>
          {requirements.map(requirement => (
            <RequirementItem
              key={requirement.id}
              requirement={requirement}
              competency={getCompetency(requirement.competencyId)}
              editable={canManageDraft}
              saving={savingRequirementId === requirement.id}
              onDecrease={() => handleChangeCount(requirement, -1)}
              onIncrease={() => handleChangeCount(requirement, 1)}
              onRemove={() => handleRemoveRequirement(requirement)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Za ovu aktivnost nisu dodate poželjne kompetencije.
        </Text>
      )}

      {canManageDraft ? (
        <View style={styles.actions}>
          <Pressable
            style={styles.addButton}
            onPress={() => setPickerVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.addButtonText}>Dodaj kompetenciju</Text>
          </Pressable>

          <CustomButton
            title="Objavi aktivnost"
            onPress={handlePublish}
            loading={publishing}
          />
        </View>
      ) : null}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Izaberite kompetenciju</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableCompetencies.length > 0 ? (
                availableCompetencies.map(competency => (
                  <Pressable
                    key={competency.id}
                    style={styles.competencyOption}
                    onPress={() => handleAddRequirement(competency)}
                    disabled={savingRequirementId === competency.id}
                  >
                    <Text style={styles.competencyOptionText}>
                      {formatCompetency(competency)}
                    </Text>
                    {savingRequirementId === competency.id ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons
                        name="add-outline"
                        size={20}
                        color={Colors.primary}
                      />
                    )}
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Sve aktivne kompetencije su već dodate.
                </Text>
              )}
            </ScrollView>

            <Pressable
              style={styles.closeButton}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.closeButtonText}>Zatvori</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RequirementItem({
  requirement,
  competency,
  editable,
  saving,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  requirement: ActivityRequirement;
  competency?: Competency;
  editable: boolean;
  saving: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.requirementItem}>
      <View style={styles.requirementInfo}>
        <Text style={styles.requirementTitle}>{formatCompetency(competency)}</Text>
        <Text style={styles.requirementCount}>
          Poželjno volontera: {requirement.requiredCount}
        </Text>
      </View>

      {editable ? (
        <View style={styles.requirementActions}>
          <CountButton
            iconName="remove-outline"
            disabled={saving || requirement.requiredCount <= 1}
            onPress={onDecrease}
          />
          <CountButton
            iconName="add-outline"
            disabled={saving}
            onPress={onIncrease}
          />
          <CountButton
            iconName="trash-outline"
            disabled={saving}
            destructive
            onPress={onRemove}
          />
        </View>
      ) : null}
    </View>
  );
}

function CountButton({
  iconName,
  disabled,
  destructive = false,
  onPress,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  disabled: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.iconButton, disabled ? styles.iconButtonDisabled : null]}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons
        name={iconName}
        size={18}
        color={destructive ? Colors.error : Colors.primary}
      />
    </Pressable>
  );
}

function formatCompetency(competency?: Competency) {
  if (!competency) {
    return 'Nepoznata kompetencija';
  }

  return `${formatProgram(competency.program)} - ${competency.level}`;
}

function formatProgram(program: string) {
  switch (program) {
    case 'FIRST_AID':
      return 'Prva pomoć';
    case 'RPPSO':
      return 'RPPSO';
    case 'DRR':
      return 'Smanjenje rizika od katastrofa';
    case 'PHV':
      return 'Promocija humanih vrednosti';
    case 'ANTITRAFFICKING':
      return 'Borba protiv trgovine ljudima';
    case 'HEALTH':
      return 'Zdravlje';
    case 'LIFESAVING':
      return 'Spasilaštvo na vodi';
    case 'DUN':
      return 'Dobrovoljno davalaštvo krvi';
    default:
      return program;
  }
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  loader: {
    marginTop: Spacing.md,
  },
  requirements: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  requirementInfo: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  requirementCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  requirementActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  addButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalContent: {
    maxHeight: '75%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFF',
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  competencyOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  competencyOptionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  closeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: Spacing.md,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
