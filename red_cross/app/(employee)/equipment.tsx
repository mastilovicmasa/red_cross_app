import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import {
  EquipmentCategory,
  EquipmentIssue,
  EquipmentStock,
  EquipmentType,
} from '@/models/Equipment';
import { AppUser } from '@/models/User';
import { getAllOpenEquipmentIssues } from '@/services/equipmentIssueService';
import { getAllEquipmentStocks } from '@/services/equipmentStockService';
import { getAllEquipmentTypes } from '@/services/equipmentTypeService';
import { getAllUsers } from '@/services/userService';

type EmployeeEquipmentTab = 'STOCK' | 'VOLUNTEERS';

const tabLabels: Record<EmployeeEquipmentTab, string> = {
  STOCK: 'Lager',
  VOLUNTEERS: 'Po volonteru',
};

type StockCardItem = {
  kind: 'stock';
  equipmentStock: EquipmentStock;
  equipmentType: EquipmentType | null;
};

type VolunteerCardItem = {
  kind: 'volunteer';
  user: AppUser;
  issueCount: number;
  latestIssuedAt: string;
};

type EquipmentListItem = StockCardItem | VolunteerCardItem;

export default function EmployeeEquipmentScreen() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentStocks, setEquipmentStocks] = useState<EquipmentStock[]>([]);
  const [openIssues, setOpenIssues] = useState<EquipmentIssue[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedTab, setSelectedTab] = useState<EmployeeEquipmentTab>('STOCK');
  const [selectedEquipmentTypeId, setSelectedEquipmentTypeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadEquipmentData();
    }, [])
  );

  const loadEquipmentData = async () => {
    try {
      setError('');
      const [types, stocks, issues, allUsers] = await Promise.all([
        getAllEquipmentTypes(),
        getAllEquipmentStocks(),
        getAllOpenEquipmentIssues(),
        getAllUsers(),
      ]);

      setEquipmentTypes(types);
      setEquipmentStocks(stocks);
      setOpenIssues(issues);
      setUsers(allUsers);
      setSelectedEquipmentTypeId(currentValue =>
        currentValue && types.some(item => item.id === currentValue)
          ? currentValue
          : types[0]?.id ?? ''
      );
    } catch (loadError) {
      console.error('Error loading employee equipment data:', loadError);
      setError('Doslo je do greske prilikom ucitavanja opreme.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEquipmentData();
  };

  const equipmentTypeMap = useMemo(
    () =>
      equipmentTypes.reduce<Record<string, EquipmentType>>((result, equipmentType) => {
        result[equipmentType.id] = equipmentType;
        return result;
      }, {}),
    [equipmentTypes]
  );

  const userMap = useMemo(
    () =>
      users.reduce<Record<string, AppUser>>((result, user) => {
        result[user.id] = user;
        return result;
      }, {}),
    [users]
  );

  const stockCards = useMemo(
    () =>
      equipmentStocks
        .filter(equipmentStock =>
          selectedEquipmentTypeId
            ? equipmentStock.equipmentTypeId === selectedEquipmentTypeId
            : true
        )
        .map(equipmentStock => ({
          kind: 'stock' as const,
          equipmentStock,
          equipmentType: equipmentTypeMap[equipmentStock.equipmentTypeId] ?? null,
        })),
    [equipmentStocks, equipmentTypeMap, selectedEquipmentTypeId]
  );

  const volunteersWithIssues = useMemo(() => {
    const grouped = new Map<
      string,
      {
        user: AppUser;
        issueCount: number;
        latestIssuedAt: string;
      }
    >();

    openIssues.forEach(issue => {
      const user = userMap[issue.issuedToUserId];

      if (!user) {
        return;
      }

      const existingGroup = grouped.get(user.id);

      if (!existingGroup) {
        grouped.set(user.id, {
          user,
          issueCount: 1,
          latestIssuedAt: issue.issuedAt,
        });
        return;
      }

      grouped.set(user.id, {
        user,
        issueCount: existingGroup.issueCount + 1,
        latestIssuedAt:
          issue.issuedAt > existingGroup.latestIssuedAt
            ? issue.issuedAt
            : existingGroup.latestIssuedAt,
      });
    });

    return Array.from(grouped.values()).sort((first, second) =>
      first.user.firstName.localeCompare(second.user.firstName)
    );
  }, [openIssues, userMap]);

  const listData = useMemo<EquipmentListItem[]>(
    () =>
      selectedTab === 'STOCK'
        ? stockCards
        : volunteersWithIssues.map(item => ({
            kind: 'volunteer' as const,
            ...item,
          })),
    [selectedTab, stockCards, volunteersWithIssues]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={listData}
        keyExtractor={item =>
          item.kind === 'stock' ? item.equipmentStock.id : item.user.id
        }
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Oprema</Text>
            </View>

            <View style={styles.headerButtonsRow}>
              <Pressable
                style={styles.secondaryHeaderButton}
                onPress={() => router.push('/(employee)/return-equipment' as any)}
              >
                <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                <Text style={styles.secondaryHeaderButtonText}>Vrati opremu</Text>
              </Pressable>
              <Pressable
                style={styles.issueButton}
                onPress={() => router.push('/(employee)/issue-equipment' as any)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={styles.issueButtonText}>Izdaj opremu</Text>
              </Pressable>
            </View>

            <View style={styles.tabs}>
              {(Object.keys(tabLabels) as EmployeeEquipmentTab[]).map(tab => (
                <Pressable
                  key={tab}
                  style={[
                    styles.tab,
                    selectedTab === tab ? styles.activeTab : null,
                  ]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedTab === tab ? styles.activeTabText : null,
                    ]}
                  >
                    {tabLabels[tab]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {selectedTab === 'STOCK' ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Tipovi opreme</Text>
                </View>

                {equipmentTypes.length === 0 ? (
                  <Text style={styles.emptyText}>Nema unetih tipova opreme.</Text>
                ) : (
                  <View style={styles.typeList}>
                    {equipmentTypes.map(equipmentType => (
                      <Pressable
                        key={equipmentType.id}
                        style={[
                          styles.typeChip,
                          selectedEquipmentTypeId === equipmentType.id
                            ? styles.typeChipSelected
                            : null,
                        ]}
                        onPress={() => setSelectedEquipmentTypeId(equipmentType.id)}
                      >
                        <Text style={styles.typeChipTitle}>{equipmentType.name}</Text>
                        <Text style={styles.typeChipSubtitle}>
                          {formatCategory(equipmentType.category)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'stock' ? (
            <EquipmentStockCard
              equipmentStock={item.equipmentStock}
              equipmentType={item.equipmentType}
            />
          ) : (
            <VolunteerEquipmentCard
              user={item.user}
              issueCount={item.issueCount}
              latestIssuedAt={item.latestIssuedAt}
              onPress={() =>
                router.push({
                  pathname: '/(employee)/equipment-volunteer/[userId]' as any,
                  params: { userId: item.user.id },
                })
              }
            />
          )
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : selectedTab === 'STOCK' ? (
            <Text style={styles.emptyText}>
              Nema lager stavki za izabrani tip opreme.
            </Text>
          ) : (
            <Text style={styles.emptyText}>
              Trenutno nema volontera sa izdatom opremom.
            </Text>
          )
        }
        ListFooterComponent={<View style={{ height: Spacing.lg }} />}
      />
    </SafeAreaView>
  );
}

function EquipmentStockCard({
  equipmentStock,
  equipmentType,
}: {
  equipmentStock: EquipmentStock;
  equipmentType: EquipmentType | null;
}) {
  const issuedQuantity =
    equipmentStock.totalQuantity - equipmentStock.availableQuantity;

  return (
    <View style={styles.stockCard}>
      <Text style={styles.stockTitle}>
        {equipmentType?.name ?? equipmentStock.equipmentTypeId}
      </Text>
      <Text style={styles.stockSubtitle}>
        {equipmentStock.size ? `Velicina ${equipmentStock.size}` : 'Bez velicine'}
      </Text>

      <View style={styles.stockMetrics}>
        <MetricItem label="Ukupno" value={String(equipmentStock.totalQuantity)} />
        <MetricItem
          label="Raspolozivo"
          value={String(equipmentStock.availableQuantity)}
        />
        <MetricItem label="Izdato" value={String(issuedQuantity)} />
      </View>
    </View>
  );
}

function VolunteerEquipmentCard({
  user,
  issueCount,
  latestIssuedAt,
  onPress,
}: {
  user: AppUser;
  issueCount: number;
  latestIssuedAt: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.volunteerCard,
        pressed ? styles.cardPressed : null,
      ]}
      onPress={onPress}
    >
      <View style={styles.volunteerHeader}>
        <View style={styles.volunteerInfo}>
          <Text style={styles.volunteerName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.volunteerSecondaryText}>
            {user.phoneNumber || user.email}
          </Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={Colors.textSecondary} />
      </View>

      <View style={styles.volunteerMetaRow}>
        <Text style={styles.volunteerMetaText}>Zaduzeno komada: {issueCount}</Text>
        <Text style={styles.volunteerMetaText}>
          Poslednje izdavanje: {formatDate(latestIssuedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatCategory(category: EquipmentCategory) {
  switch (category) {
    case 'CLOTHING':
      return 'Odeca';
    case 'WORKSHOP_MATERIAL':
      return 'Radionicarski materijal';
    case 'OTHER':
      return 'Ostalo';
    default:
      return category;
  }
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
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  issueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  issueButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryHeaderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryHeaderButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  activeTab: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  typeList: {
    gap: Spacing.sm,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
  },
  typeChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F9DCDC',
  },
  typeChipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  typeChipSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stockCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stockSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  stockMetrics: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricItem: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: Spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  volunteerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  volunteerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  volunteerInfo: {
    flex: 1,
  },
  volunteerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  volunteerSecondaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  volunteerMetaRow: {
    gap: 4,
  },
  volunteerMetaText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  cardPressed: {
    opacity: 0.85,
  },
  stateContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
});
