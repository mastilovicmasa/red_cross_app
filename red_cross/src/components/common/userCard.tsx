import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { AppUser, UserRole } from '@/models/User';

type UserCardProps = {
  user: AppUser;
  showEmail?: boolean;
  showPhone?: boolean;
  showStatus?: boolean;
  showRole?: boolean;
  showAdminActions?: boolean;
  showCompetencyAction?: boolean;
  onChangeRole?: (user: AppUser) => void;
  onToggleStatus?: (user: AppUser) => void;
  onEditCompetencies?: (user: AppUser) => void;
};

export function UserCard({
  user,
  showEmail = false,
  showPhone = false,
  showStatus = false,
  showRole = false,
  showAdminActions = false,
  showCompetencyAction = false,
  onChangeRole,
  onToggleStatus,
  onEditCompetencies,
}: UserCardProps) {
  return (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userMainInfo}>
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>

          {showEmail && (
            <Text style={styles.userSecondaryText}>{user.email}</Text>
          )}

          {showPhone && (
            <Text style={styles.userSecondaryText}>
              Telefon: {user.phoneNumber || 'Nije uneto'}
            </Text>
          )}
        </View>

        {showStatus && (
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
        )}
      </View>

      {showRole && (
        <Text style={styles.roleText}>Uloga: {formatRole(user.role)}</Text>
      )}

      {(showAdminActions || showCompetencyAction) && (
        <View style={styles.actions}>
          {showAdminActions && (
            <View style={styles.topActions}>
              <Pressable
                style={styles.roleButton}
                onPress={() => onChangeRole?.(user)}
              >
                <Text style={styles.roleButtonText}>Promeni ulogu</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.statusButton,
                  !user.isActive && styles.reactivateButton,
                ]}
                onPress={() => onToggleStatus?.(user)}
              >
                <Text style={styles.statusButtonText}>
                  {user.isActive ? 'Deaktiviraj' : 'Reaktiviraj'}
                </Text>
              </Pressable>
            </View>
          )}

          {showCompetencyAction && (
            <Pressable
              style={styles.competenciesButton}
              onPress={() => onEditCompetencies?.(user)}
            >
              <Text style={styles.competenciesButtonText}>
                Pregled kompetencija
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
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
  userMainInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userSecondaryText: {
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
  competenciesButton: {
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