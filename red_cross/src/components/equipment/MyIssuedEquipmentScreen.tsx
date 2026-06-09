import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { EquipmentIssue, EquipmentStock, EquipmentType } from '@/models/Equipment';
import { getOpenEquipmentIssuesByUser } from '@/services/equipmentIssueService';
import { getAllEquipmentStocks } from '@/services/equipmentStockService';
import { getAllEquipmentTypes } from '@/services/equipmentTypeService';

type MyEquipmentItem = {
  issue: EquipmentIssue;
  stock: EquipmentStock | null;
  type: EquipmentType | null;
};

export function MyIssuedEquipmentScreen() {
  const { appUser } = useAuth();
  const [issues, setIssues] = useState<EquipmentIssue[]>([]);
  const [stocks, setStocks] = useState<EquipmentStock[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadEquipment();
    }, [appUser?.id])
  );

  const loadEquipment = async () => {
    if (!appUser?.id) {
      setIssues([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError('');
      const [openIssues, allStocks, allTypes] = await Promise.all([
        getOpenEquipmentIssuesByUser(appUser.id),
        getAllEquipmentStocks(),
        getAllEquipmentTypes(),
      ]);

      setIssues(openIssues);
      setStocks(allStocks);
      setTypes(allTypes);
    } catch (loadError) {
      console.error('Error loading issued equipment:', loadError);
      setError('Doslo je do greske prilikom ucitavanja opreme.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const items = useMemo<MyEquipmentItem[]>(
    () =>
      issues.map(issue => {
        const stock = stockMap[issue.equipmentStockId] ?? null;

        return {
          issue,
          stock,
          type: stock ? typeMap[stock.equipmentTypeId] ?? null : null,
        };
      }),
    [issues, stockMap, typeMap]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={items}
        keyExtractor={item => item.issue.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadEquipment();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Zadužena oprema</Text>
            <Text style={styles.subtitle}>
              Molimo vas da opremu vratite čistu i u što kraćem roku.
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderContent}>
                <Text style={styles.cardTitle}>
                  {item.type?.name ?? item.issue.equipmentStockId}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {item.stock?.size ? `Velicina ${item.stock.size}` : 'Bez velicine'}
                </Text>
              </View>

              <IssueAgeBadge issuedAt={item.issue.issuedAt} />
            </View>

            <Text style={styles.cardMeta}>
              Datum izdavanja: {formatDate(item.issue.issuedAt)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Trenutno nemate zaduzenu opremu.
            </Text>
          )
        }
      />
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
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: Colors.textPrimary,
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
});
