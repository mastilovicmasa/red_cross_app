import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Competency } from '@/models/Competency';
import { AppUser, UserRole } from '@/models/User';
import { getAllCompetencies } from '@/services/competencyService';
import { getUserById, updateUser } from '@/services/userService';

export default function UserCompetenciesScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [user, setUser] = useState<AppUser | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;

    const [userData, competenciesData] = await Promise.all([
      getUserById(userId),
      getAllCompetencies(),
    ]);

    setUser(userData);
    setCompetencies(competenciesData);
  };

  const userCompetencies = useMemo(() => {
    if (!user) return [];

    return competencies.filter(competency =>
      user.competencyIds.includes(competency.id)
    );
  }, [user, competencies]);

  const handleRemoveCompetency = (competency: Competency) => {
    if (!user) return;

    Alert.alert(
      'Uklanjanje kompetencije',
      `Da li želite da uklonite kompetenciju "${formatProgram(competency.program)} - ${competency.level}" sa profila korisnika ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Ukloni',
          style: 'destructive',
          onPress: async () => {
            const updatedCompetencyIds = user.competencyIds.filter(
              id => id !== competency.id
            );

            await updateUser(user.id, {
              competencyIds: updatedCompetencyIds,
            });

            await loadData();
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Korisnik nije pronađen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.backButtonContainer}>
          <BackButton onPress={() => router.back()} />
        </View>

        <Text style={styles.screenTitle}>Kompetencije korisnika</Text>

        <View style={styles.userCard}>
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>

          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.userMeta}>
            <Text style={styles.metaText}>Uloga: {formatRole(user.role)}</Text>
            <Text style={styles.metaText}>
              Status: {user.isActive ? 'Aktivan' : 'Neaktivan'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kompetencije korisnika</Text>

          {userCompetencies.length > 0 ? (
            <View style={styles.competencyList}>
              {userCompetencies.map(competency => (
                <View key={competency.id} style={styles.competencyItem}>
                  <View style={styles.competencyInfo}>
                    <Text style={styles.competencyProgram}>
                      {formatProgram(competency.program)}
                    </Text>
                    <Text style={styles.competencyLevel}>
                      {competency.level}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRemoveCompetency(competency)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#B42318" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Korisnik nema dodatih kompetencija.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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

function formatRole(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'EMPLOYEE':
      return 'Zaposleni';
    case 'EXECUTIVE_BOARD':
      return 'Član izvršnog odbora';
    case 'INSTRUCTOR':
      return 'Instruktor';
    case 'VOLUNTEER':
      return 'Volonter';
    default:
      return role;
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  backButtonContainer: {
    marginBottom: Spacing.md,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  userMeta: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  competencyList: {
    gap: Spacing.sm,
  },
  competencyItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  competencyInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  competencyProgram: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  competencyLevel: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
