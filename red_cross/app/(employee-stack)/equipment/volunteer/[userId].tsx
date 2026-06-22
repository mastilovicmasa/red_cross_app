import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { EquipmentIssue, EquipmentStock, EquipmentType } from '@/models/Equipment';
import { AppUser } from '@/models/User';
import {
  getOpenEquipmentIssuesByUser,
  returnMultipleEquipment,
} from '@/services/equipmentIssueService';
import { getAllEquipmentStocks } from '@/services/equipmentStockService';
import { getAllEquipmentTypes } from '@/services/equipmentTypeService';
import { getUserById } from '@/services/userService';

export default function EmployeeVolunteerEquipmentScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<AppUser | null>(null);
  const [issues, setIssues] = useState<EquipmentIssue[]>([]);
  const [stocks, setStocks] = useState<EquipmentStock[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadVolunteerEquipmentData();
    }, [userId])
  );

  const loadVolunteerEquipmentData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [resolvedUser, openIssues, allStocks, allTypes] = await Promise.all([
        getUserById(userId),
        getOpenEquipmentIssuesByUser(userId),
        getAllEquipmentStocks(),
        getAllEquipmentTypes(),
      ]);

      setUser(resolvedUser);
      setIssues(openIssues);
      setStocks(allStocks);
      setTypes(allTypes);
      setSelectedIssueIds(currentIds =>
        currentIds.filter(issueId => openIssues.some(issue => issue.id === issueId))
      );
    } catch (loadError) {
      console.error('Error loading volunteer equipment data:', loadError);
      setError('Doslo je do greske prilikom ucitavanja zaduzenja.');
    } finally {
      setLoading(false);
    }
  };

  const stockMap = useMemo(
    () =>
      stocks.reduce<Record<string, EquipmentStock>>((result, stock) => {
        result[stock.id] = stock;
        return result;
      }, {}),
    [stocks]
  );

  const typeMap = useMemo(
    () =>
      types.reduce<Record<string, EquipmentType>>((result, type) => {
        result[type.id] = type;
        return result;
      }, {}),
    [types]
  );

  const toggleIssueSelection = (issueId: string) => {
    setSelectedIssueIds(currentIds =>
      currentIds.includes(issueId)
        ? currentIds.filter(id => id !== issueId)
        : [...currentIds, issueId]
    );
  };

  const handleReturnSelected = async () => {
    if (selectedIssueIds.length === 0) {
      Alert.alert('Greska', 'Izaberite bar jednu stavku za razduzivanje.');
      return;
    }

    try {
      setSubmitting(true);
      await returnMultipleEquipment(selectedIssueIds);
      Alert.alert('Uspesno', 'Izabrane stavke su razduzene.');
      setSelectedIssueIds([]);
      await loadVolunteerEquipmentData();
    } catch (error) {
      console.error('Error returning volunteer equipment:', error);
      Alert.alert(
        'Greska',
        error instanceof Error ? error.message : 'Nije moguce razduziti opremu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.replace('/(employee)/equipment' as any)} />

        <Text style={styles.title}>
          {user ? `${user.firstName} ${user.lastName}` : 'Oprema volontera'}
        </Text>

        {user ? (
          <Text style={styles.subtitle}>
            Pregled trenutno izdate opreme i datuma izdavanja. Biranjem stavki možete razdužiti opremu.
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : issues.length === 0 ? (
          <Text style={styles.emptyText}>Volonter trenutno nema izdatu opremu.</Text>
        ) : (
          <>
            {issues.map(issue => {
              const stock = stockMap[issue.equipmentStockId];
              const type = stock ? typeMap[stock.equipmentTypeId] : null;
              const isSelected = selectedIssueIds.includes(issue.id);

              return (
                <Pressable
                  key={issue.id}
                  style={[
                    styles.issueCard,
                    isSelected ? styles.issueCardSelected : null,
                  ]}
                  onPress={() => toggleIssueSelection(issue.id)}
                >
                  <View style={styles.issueHeader}>
                    <View style={styles.issueInfo}>
                      <Text style={styles.issueTitle}>
                        {type?.name ?? issue.equipmentStockId}
                      </Text>
                      <Text style={styles.issueSubtitle}>
                        {stock?.size ? `Velicina ${stock.size}` : 'Bez velicine'}
                      </Text>
                    </View>
                    <View style={styles.issueHeaderActions}>
                      <IssueAgeBadge issuedAt={issue.issuedAt} />
                      <Ionicons
                        name={
                          isSelected ? 'checkbox-outline' : 'square-outline'
                        }
                        size={22}
                        color={isSelected ? Colors.primary : Colors.textSecondary}
                      />
                    </View>
                  </View>

                  <Text style={styles.issueMeta}>
                    Izdato: {formatDate(issue.issuedAt)}
                  </Text>
                </Pressable>
              );
            })}

            <View style={styles.actions}>
              <CustomButton
                title={`Razduzi odabrano (${selectedIssueIds.length})`}
                onPress={handleReturnSelected}
                loading={submitting}
                disabled={selectedIssueIds.length === 0}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IssueAgeBadge({ issuedAt }: { issuedAt: string }) {
  const ageInDays = getIssueAgeInDays(issuedAt);
  const variant =
    ageInDays < 5 ? 'fresh' : ageInDays < 10 ? 'warning' : 'overdue';

  const label =
    variant === 'fresh'
      ? 'Sveze izdato'
      : variant === 'warning'
        ? 'Vratiti uskoro'
        : 'Rok istekao';

  return (
    <View
      style={[
        styles.badge,
        variant === 'fresh'
          ? styles.badgeFresh
          : variant === 'warning'
            ? styles.badgeWarning
            : styles.badgeOverdue,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          variant === 'fresh'
            ? styles.badgeTextFresh
            : variant === 'warning'
              ? styles.badgeTextWarning
              : styles.badgeTextOverdue,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function getIssueAgeInDays(value: string) {
  const issuedAt = new Date(value);

  if (Number.isNaN(issuedAt.getTime())) {
    return 0;
  }

  const millisecondsInDay = 1000 * 60 * 60 * 24;

  return Math.floor((Date.now() - issuedAt.getTime()) / millisecondsInDay);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}.`;
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
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  stateContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  issueCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  issueCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  issueInfo: {
    flex: 1,
  },
  issueHeaderActions: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  issueSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  issueMeta: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeFresh: {
    backgroundColor: '#E7F8EF',
  },
  badgeWarning: {
    backgroundColor: '#FFF4DB',
  },
  badgeOverdue: {
    backgroundColor: '#FDECEC',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextFresh: {
    color: '#1B7F46',
  },
  badgeTextWarning: {
    color: '#B54708',
  },
  badgeTextOverdue: {
    color: '#B42318',
  },
  actions: {
    marginTop: Spacing.sm,
  },
});
