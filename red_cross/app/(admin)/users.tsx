import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View, 
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { AppUser, UserRole } from '@/models/User';
import {
  getAllUsers,
  updateUser,
} from '@/services/userService';

const roles: UserRole[] = [
  'VOLUNTEER',
  'EMPLOYEE',
  'INSTRUCTOR',
  'EXECUTIVE_BOARD',
  'ADMIN',
];

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('VOLUNTEER');
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const filteredUsers = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return users.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return (
        fullName.includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue)
      );
    });
  }, [users, search]);

  const handleChangeRole = (user: AppUser) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;

    await updateUser(selectedUser.id, { role: selectedRole });
    setRoleModalVisible(false);
    setSelectedUser(null);
    await loadUsers();
  };

  const handleToggleStatus = (user: AppUser) => {
    const nextStatus = !user.isActive;

    Alert.alert(
      nextStatus ? 'Reaktivacija profila' : 'Deaktivacija profila',
      `Da li želite da ${nextStatus ? 'reaktivirate' : 'deaktivirate'} profil korisnika ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: nextStatus ? 'Reaktiviraj' : 'Deaktiviraj',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            await updateUser(user.id,{ isActive: nextStatus });
            await loadUsers();
          },
        },
      ]
    );
  };

  const handleEditCompetencies = (user: AppUser) => {
    router.push({
      pathname: '/user-competencies/[userId]' as any,
      params: { userId: user.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Promena uloge</Text>

            {selectedUser && (
              <Text style={styles.modalSubtitle}>
                {selectedUser.firstName} {selectedUser.lastName}
              </Text>
            )}

            <View style={styles.roleOptions}>
              {roles.map(role => (
                <Pressable
                  key={role}
                  style={[
                    styles.roleOption,
                    selectedRole === role && styles.selectedRoleOption,
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      selectedRole === role && styles.selectedRoleOptionText,
                    ]}
                  >
                    {formatRole(role)}
                  </Text>

                  {selectedRole === role && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setRoleModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Odustani</Text>
              </Pressable>

              <Pressable style={styles.saveButton} onPress={handleSaveRole}>
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
        <Text style={styles.title}>Korisnici</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pretraga po imenu, prezimenu ili emailu"
            style={styles.searchInput}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {filteredUsers.map(user => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View>
                <Text style={styles.userName}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  user.isActive ? styles.activeBadge : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    user.isActive ? styles.activeText : styles.inactiveText,
                  ]}
                >
                  {user.isActive ? 'Aktivan' : 'Neaktivan'}
                </Text>
              </View>
            </View>

            <Text style={styles.roleText}>
              Uloga: {formatRole(user.role)}
            </Text>
            <View style={styles.actions}>
              <View style={styles.topActions}>
                <Pressable
                  style={styles.roleButton}
                  onPress={() => handleChangeRole(user)}
                >
                  <Text style={styles.roleButtonText}>Promeni ulogu</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.statusButton,
                    !user.isActive && styles.reactivateButton,
                  ]}
                  onPress={() => handleToggleStatus(user)}
                >
                  <Text style={styles.statusButtonText}>
                    {user.isActive ? 'Deaktiviraj' : 'Reaktiviraj'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.competenciesButton}
                onPress={() => handleEditCompetencies(user)}
              >
                <Text style={styles.competenciesButtonText}>
                  Pregled kompetencija
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <Text style={styles.emptyText}>Nema pronađenih korisnika.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
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
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },

  topActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleButtonText: {
    color: '#FFF',
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
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  roleOptions: {
    gap: Spacing.sm,
  },
  roleOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedRoleOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  roleOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  selectedRoleOptionText: {
    color: Colors.primary,
    fontWeight: '700',
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
  competenciesButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  competenciesButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});