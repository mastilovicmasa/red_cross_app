import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useAuth } from '@/hooks/useAuth';
import { Competency } from '@/models/Competency';
import { getAllCompetencies } from '@/services/competencyService';

type ProfileScreenContentProps = {
  showCompetencies?: boolean;
};

export function ProfileScreenContent({
  showCompetencies = true,
}: ProfileScreenContentProps) {
  const { appUser } = useAuth();
  const [competencies, setCompetencies] = useState<Competency[]>([]);

  useEffect(() => {
    if (!showCompetencies) {
      return;
    }

    const loadCompetencies = async () => {
      const data = await getAllCompetencies();
      setCompetencies(data);
    };

    loadCompetencies();
  }, [showCompetencies]);

  if (!appUser) return null;

  const userCompetencies = competencies.filter(competency =>
    appUser.competencyIds.includes(competency.id)
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <ProfileAvatar imageUrl={appUser.profileImageUrl} size={104} />
          </View>

          <Text style={styles.name}>
            {appUser.firstName} {appUser.lastName}
          </Text>

          <Text style={styles.role}>{formatRole(appUser.role)}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Osnovni podaci</Text>

            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
            </Pressable>
          </View>

          <InfoRow label="Email" value={appUser.email} />
          <InfoRow label="Pol" value={formatGender(appUser.gender)} />
          <InfoRow
            label="Datum rođenja"
            value={appUser.dateOfBirth ? formatDate(appUser.dateOfBirth) : 'Nije uneto'}
          />
          <InfoRow label="Telefon" value={appUser.phoneNumber || 'Nije uneto'} />
          <InfoRow label="Škola / fakultet" value={appUser.school || 'Nije uneto'} />
        </View>

        {showCompetencies ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kompetencije</Text>

              <Pressable
                onPress={() => router.push('/manage-competencies')}
                style={styles.iconButton}
              >
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </Pressable>
            </View>

            {userCompetencies.length > 0 ? (
              <View style={styles.competencyList}>
                {userCompetencies.map(competency => (
                  <View key={competency.id} style={styles.competencyItem}>
                    <Text style={styles.competencyProgram}>
                      {formatProgram(competency.program)}
                    </Text>
                    <Text style={styles.competencyLevel}>{competency.level}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionDescription}>Nema dodatih kompetencija</Text>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>QR identifikacija</Text>

            <Pressable
              onPress={() => router.push('/qr-code')}
              style={styles.iconButton}
            >
              <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
            </Pressable>
          </View>

          <Text style={styles.sectionDescription}>
            Prikažite QR kod za identifikaciju prilikom izdavanja opreme.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prisustvo na aktivnosti</Text>

            <Pressable
              onPress={() => router.push('/scan-attendance')}
              style={styles.iconButton}
            >
              <Ionicons name="scan-outline" size={20} color={Colors.primary} />
            </Pressable>
          </View>

          <Text style={styles.sectionDescription}>
            Skenirajte QR kod interne aktivnosti kako biste evidentirali svoje prisustvo.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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

function formatDate(dateString: string) {
  const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}.`;
}

function formatRole(role: string) {
  switch (role) {
    case 'VOLUNTEER':
      return 'Volonter';
    case 'ADMIN':
      return 'Administrator';
    case 'EMPLOYEE':
      return 'Zaposleni';
    case 'EXECUTIVE_BOARD':
      return 'Član izvršnog odbora';
    case 'INSTRUCTOR':
      return 'Instruktor';
    default:
      return role;
  }
}

function formatGender(gender: string) {
  return gender === 'MALE' ? 'Muški' : 'Ženski';
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
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  role: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  iconButton: {
    padding: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoRow: {
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
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
});
