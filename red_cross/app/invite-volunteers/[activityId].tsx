import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { ActivityRequirement, ExternalActivity } from '@/models/Activity';
import { Competency } from '@/models/Competency';
import { Invitation, InvitationResponseStatus } from '@/models/Invitation';
import { AppUser, Gender } from '@/models/User';
import { getActivityRequirements } from '@/services/activityRequirementService';
import { getActivityById } from '@/services/activityService';
import { getAllCompetencies } from '@/services/competencyService';
import {
  createActivityInvitations,
  getActivityInvitations,
} from '@/services/invitationService';
import { getAllUsers } from '@/services/userService';

type VolunteerTab = 'SUGGESTED' | 'ALL';
type GenderFilter = 'ALL' | Gender;
type AgeSort = 'NONE' | 'YOUNGEST_FIRST' | 'OLDEST_FIRST';

const invitationStatusLabels: Record<InvitationResponseStatus, string> = {
  PENDING: 'Poziv je poslat',
  ACCEPTED: 'Prihvatio/la',
  DECLINED: 'Odbio/la',
};

export default function InviteVolunteersScreen() {
  const { appUser } = useAuth();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const [activity, setActivity] = useState<ExternalActivity | null>(null);
  const [requirements, setRequirements] = useState<ActivityRequirement[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [volunteers, setVolunteers] = useState<AppUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<string[]>(
    []
  );
  const [selectedTab, setSelectedTab] = useState<VolunteerTab>('SUGGESTED');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ALL');
  const [ageSort, setAgeSort] = useState<AgeSort>('NONE');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [activityId, appUser?.id]);

  const loadData = async () => {
    if (!activityId || !appUser?.id) {
      setError('Aktivnost nije pronađena.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const loadedActivity = await getActivityById(activityId);

      if (
        !loadedActivity ||
        loadedActivity.type !== 'EXTERNAL' ||
        loadedActivity.status !== 'ACTIVE' ||
        loadedActivity.createdByUserId !== appUser.id ||
        appUser.role !== 'EMPLOYEE'
      ) {
        setError('Nemate dozvolu za slanje poziva za ovu aktivnost.');
        return;
      }

      const [
        loadedRequirements,
        loadedCompetencies,
        loadedUsers,
        loadedInvitations,
      ] = await Promise.all([
        getActivityRequirements(activityId),
        getAllCompetencies(),
        getAllUsers(),
        getActivityInvitations(activityId),
      ]);

      setActivity(loadedActivity);
      setRequirements(loadedRequirements);
      setCompetencies(loadedCompetencies);
      setVolunteers(
        loadedUsers.filter(user => user.role === 'VOLUNTEER' && user.isActive)
      );
      setInvitations(loadedInvitations);
    } catch (loadError) {
      console.error('Error loading volunteers for invitations:', loadError);
      setError('Došlo je do greške prilikom učitavanja volontera.');
    } finally {
      setLoading(false);
    }
  };

  const requiredCompetencyIds = useMemo(
    () => new Set(requirements.map(requirement => requirement.competencyId)),
    [requirements]
  );
  const invitationsByVolunteerId = useMemo(
    () =>
      new Map(
        invitations.map(invitation => [invitation.volunteerId, invitation])
      ),
    [invitations]
  );
  const competenciesById = useMemo(
    () =>
      new Map(competencies.map(competency => [competency.id, competency])),
    [competencies]
  );

  const visibleVolunteers = useMemo(() => {
    const searchValue = search.toLowerCase().trim();
    const filteredVolunteers = volunteers.filter(volunteer => {
      const fullName =
        `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchValue);
      const matchesGender =
        genderFilter === 'ALL' || volunteer.gender === genderFilter;
      const matchesTab =
        selectedTab === 'ALL' ||
        volunteer.competencyIds.some(competencyId =>
          requiredCompetencyIds.has(competencyId)
        );

      return matchesSearch && matchesGender && matchesTab;
    });

    return [...filteredVolunteers].sort((first, second) => {
      if (ageSort === 'NONE') {
        return first.lastName.localeCompare(second.lastName);
      }

      const firstBirthDate = getBirthDateTimestamp(first.dateOfBirth);
      const secondBirthDate = getBirthDateTimestamp(second.dateOfBirth);

      return ageSort === 'YOUNGEST_FIRST'
        ? secondBirthDate - firstBirthDate
        : firstBirthDate - secondBirthDate;
    });
  }, [
    ageSort,
    genderFilter,
    requiredCompetencyIds,
    search,
    selectedTab,
    volunteers,
  ]);

  const selectableVisibleVolunteerIds = visibleVolunteers
    .filter(volunteer => !invitationsByVolunteerId.has(volunteer.id))
    .map(volunteer => volunteer.id);
  const areAllVisibleSelected =
    selectableVisibleVolunteerIds.length > 0 &&
    selectableVisibleVolunteerIds.every(volunteerId =>
      selectedVolunteerIds.includes(volunteerId)
    );

  const toggleVolunteer = (volunteerId: string) => {
    if (invitationsByVolunteerId.has(volunteerId)) {
      return;
    }

    setSelectedVolunteerIds(currentIds =>
      currentIds.includes(volunteerId)
        ? currentIds.filter(id => id !== volunteerId)
        : [...currentIds, volunteerId]
    );
  };

  const toggleAllVisible = () => {
    if (areAllVisibleSelected) {
      setSelectedVolunteerIds(currentIds =>
        currentIds.filter(
          volunteerId => !selectableVisibleVolunteerIds.includes(volunteerId)
        )
      );
      return;
    }

    setSelectedVolunteerIds(currentIds => [
      ...new Set([...currentIds, ...selectableVisibleVolunteerIds]),
    ]);
  };

  const handleSendInvitations = () => {
    if (!activity || selectedVolunteerIds.length === 0) {
      return;
    }

    Alert.alert(
      'Slanje poziva',
      `Da li želite da pošaljete poziv za ${selectedVolunteerIds.length} volontera?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Pošalji',
          onPress: async () => {
            try {
              setSending(true);
              await createActivityInvitations(
                activity.id,
                selectedVolunteerIds
              );
              setSelectedVolunteerIds([]);
              await loadData();
              Alert.alert('Uspešno', 'Pozivi su poslati.');
            } catch (sendError) {
              console.error('Error sending invitations:', sendError);
              Alert.alert('Greška', 'Nije moguće poslati pozive.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <CustomButton title="Nazad" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={visibleVolunteers}
        keyExtractor={volunteer => volunteer.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <BackButton onPress={() => router.back()} />
              <Text style={styles.title}>Pozivanje volontera</Text>
              <Text style={styles.subtitle}>{activity.title}</Text>
            </View>

            <View style={styles.tabs}>
              <TabButton
                title={`Predloženi (${getSuggestedCount(
                  volunteers,
                  requiredCompetencyIds
                )})`}
                active={selectedTab === 'SUGGESTED'}
                onPress={() => setSelectedTab('SUGGESTED')}
              />
              <TabButton
                title={`Svi (${volunteers.length})`}
                active={selectedTab === 'ALL'}
                onPress={() => setSelectedTab('ALL')}
              />
            </View>

            {requirements.length === 0 ? (
              <Text style={styles.infoText}>
                Aktivnost nema poželjne kompetencije. Koristite karticu „Svi“ za
                ručni izbor volontera.
              </Text>
            ) : null}

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={Colors.textSecondary}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Pretraga po imenu i prezimenu"
                placeholderTextColor={Colors.textSecondary}
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.filterLabel}>Pol</Text>
            <View style={styles.filterRow}>
              <FilterButton
                title="Svi"
                active={genderFilter === 'ALL'}
                onPress={() => setGenderFilter('ALL')}
              />
              <FilterButton
                title="Ženski"
                active={genderFilter === 'FEMALE'}
                onPress={() => setGenderFilter('FEMALE')}
              />
              <FilterButton
                title="Muški"
                active={genderFilter === 'MALE'}
                onPress={() => setGenderFilter('MALE')}
              />
            </View>

            <Text style={styles.filterLabel}>Sortiranje po godinama</Text>
            <View style={styles.filterRow}>
              <FilterButton
                title="Bez"
                active={ageSort === 'NONE'}
                onPress={() => setAgeSort('NONE')}
              />
              <FilterButton
                title="Mlađi prvo"
                active={ageSort === 'YOUNGEST_FIRST'}
                onPress={() => setAgeSort('YOUNGEST_FIRST')}
              />
              <FilterButton
                title="Stariji prvo"
                active={ageSort === 'OLDEST_FIRST'}
                onPress={() => setAgeSort('OLDEST_FIRST')}
              />
            </View>

            <View style={styles.selectionHeader}>
              <Text style={styles.selectionText}>
                Označeno: {selectedVolunteerIds.length}
              </Text>
              <Pressable
                onPress={toggleAllVisible}
                disabled={selectableVisibleVolunteerIds.length === 0}
              >
                <Text
                  style={[
                    styles.selectAllText,
                    selectableVisibleVolunteerIds.length === 0
                      ? styles.disabledText
                      : null,
                  ]}
                >
                  {areAllVisibleSelected
                    ? 'Poništi prikazane'
                    : 'Označi sve prikazane'}
                </Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <VolunteerInvitationCard
            volunteer={item}
            matchingCompetencies={item.competencyIds
              .filter(competencyId => requiredCompetencyIds.has(competencyId))
              .map(competencyId => competenciesById.get(competencyId))
              .filter((competency): competency is Competency =>
                Boolean(competency)
              )}
            invitation={invitationsByVolunteerId.get(item.id)}
            selected={selectedVolunteerIds.includes(item.id)}
            onToggle={() => toggleVolunteer(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nema volontera koji odgovaraju izabranim kriterijumima.
          </Text>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <CustomButton
              title={`Pošalji pozive (${selectedVolunteerIds.length})`}
              onPress={handleSendInvitations}
              loading={sending}
              disabled={selectedVolunteerIds.length === 0}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function VolunteerInvitationCard({
  volunteer,
  matchingCompetencies,
  invitation,
  selected,
  onToggle,
}: {
  volunteer: AppUser;
  matchingCompetencies: Competency[];
  invitation?: Invitation;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.volunteerCard,
        selected ? styles.selectedVolunteerCard : null,
      ]}
      disabled={Boolean(invitation)}
      onPress={onToggle}
    >
      <View style={styles.volunteerHeader}>
        <View style={styles.volunteerInfo}>
          <Text style={styles.volunteerName}>
            {volunteer.firstName} {volunteer.lastName}
          </Text>
          <Text style={styles.volunteerMeta}>
            {formatGender(volunteer.gender)} · {formatAge(volunteer.dateOfBirth)}
          </Text>
        </View>

        {invitation ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {invitationStatusLabels[invitation.response]}
            </Text>
          </View>
        ) : (
          <Ionicons
            name={selected ? 'checkbox-outline' : 'square-outline'}
            size={24}
            color={selected ? Colors.primary : Colors.textSecondary}
          />
        )}
      </View>

      {matchingCompetencies.length > 0 ? (
        <Text style={styles.competencyText}>
          Podudaranje:{' '}
          {matchingCompetencies.map(formatCompetency).join(', ')}
        </Text>
      ) : (
        <Text style={styles.noCompetencyText}>
          Nema podudaranja sa poželjnim kompetencijama
        </Text>
      )}
    </Pressable>
  );
}

function TabButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tab, active ? styles.activeTab : null]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active ? styles.activeTabText : null]}>
        {title}
      </Text>
    </Pressable>
  );
}

function FilterButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterButton, active ? styles.activeFilterButton : null]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          active ? styles.activeFilterButtonText : null,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function getSuggestedCount(
  volunteers: AppUser[],
  requiredCompetencyIds: Set<string>
) {
  return volunteers.filter(volunteer =>
    volunteer.competencyIds.some(competencyId =>
      requiredCompetencyIds.has(competencyId)
    )
  ).length;
}

function formatCompetency(competency: Competency) {
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

function formatGender(gender: Gender) {
  return gender === 'FEMALE' ? 'Ženski pol' : 'Muški pol';
}

function formatAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return 'godine nisu unete';
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return `${age} god.`;
}

function getBirthDateTimestamp(dateOfBirth: string) {
  const timestamp = new Date(dateOfBirth).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  infoText: {
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  activeFilterButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeFilterButtonText: {
    color: Colors.primary,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  disabledText: {
    opacity: 0.4,
  },
  volunteerCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: '#FFF',
  },
  selectedVolunteerCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  volunteerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  volunteerInfo: {
    flex: 1,
  },
  volunteerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  volunteerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  competencyText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  noCompetencyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  statusBadge: {
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  footer: {
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
