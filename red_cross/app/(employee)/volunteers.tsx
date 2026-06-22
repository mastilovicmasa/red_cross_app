import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserCard } from '@/components/common/userCard';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { AppUser } from '@/models/User';
import { getAllUsers } from '@/services/userService';

export default function EmployeeVolunteersScreen() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');

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
      const isVisibleRole =
        user.role === 'VOLUNTEER' ||
        user.role === 'INSTRUCTOR' ||
        user.role === 'EXECUTIVE_BOARD';

      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();

      return (
        isVisibleRole &&
        (
          fullName.includes(searchValue) ||
          user.phoneNumber?.toLowerCase().includes(searchValue) ||
          user.email.toLowerCase().includes(searchValue)
        )
      );
    });
  }, [users, search]);

  const handleEditCompetencies = (user: AppUser) => {
    router.push({
      pathname: '/(shared)/users/[userId]/competencies' as any,
      params: { userId: user.id },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Volonteri</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pretraga po imenu, prezimenu ili telefonu"
            style={styles.searchInput}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {filteredUsers.map(user => (
          <UserCard
            key={user.id}
            user={user}
            showPhone
            showStatus
            showRole
            showCompetencyAction
            onEditCompetencies={handleEditCompetencies}
          />
        ))}

        {filteredUsers.length === 0 && (
          <Text style={styles.emptyText}>Nema pronađenih korisnika.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
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
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
