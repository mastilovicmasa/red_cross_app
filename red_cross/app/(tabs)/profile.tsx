import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { globalStyles } from '@/constants/globalStyles';
import { useAuth } from '@/hooks/useAuth';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { appUser } = useAuth();

  if (!appUser) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.avatar} />

          <Text style={styles.name}>
            {appUser.firstName} {appUser.lastName}
          </Text>

          <Text style={styles.role}>
            {formatRole(appUser.role)}
          </Text>
        </View>

        {/* INFO SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Osnovni podaci</Text>

            <Pressable onPress={() => router.push('/edit-profile')}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
            </Pressable>
          </View>

          <InfoRow label="Email" value={appUser.email} />
          <InfoRow label="Pol" value={formatGender(appUser.gender)} />
          <InfoRow label="Datum rođenja" value={appUser.dateOfBirth || 'Nije uneto'} />
          <InfoRow label="Telefon" value={appUser.phoneNumber || 'Nije uneto'} />
          <InfoRow
            label="Škola / fakultet"
            value={appUser.school || 'Nije uneto'}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---------- HELPER KOMPONENTE ---------- */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/* ---------- FORMAT ---------- */

function formatRole(role: string) {
  switch (role) {
    case 'VOLUNTEER':
      return 'Volonter';
    case 'ADMIN':
      return 'Administrator';
    case 'EMPLOYEE':
      return 'Zaposleni';
    case 'BOARD_MEMBER':
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

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
  },

  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEE',
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
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
});