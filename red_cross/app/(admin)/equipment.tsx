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
  EquipmentStock,
  EquipmentType,
} from '@/models/Equipment';
import { exportEquipmentQrCodesPdf } from '@/services/equipmentQrExportService';
import { getAllEquipmentStocks } from '@/services/equipmentStockService';
import { getAllEquipmentTypes } from '@/services/equipmentTypeService';

export default function AdminEquipmentScreen() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentStocks, setEquipmentStocks] = useState<EquipmentStock[]>([]);
  const [selectedEquipmentTypeId, setSelectedEquipmentTypeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEquipmentData();
    }, [])
  );

  const loadEquipmentData = async () => {
    try {
      setError('');
      const [types, stocks] = await Promise.all([
        getAllEquipmentTypes(),
        getAllEquipmentStocks(),
      ]);

      setEquipmentTypes(types);
      setEquipmentStocks(stocks);
      setSelectedEquipmentTypeId(currentValue =>
        currentValue && types.some(item => item.id === currentValue)
          ? currentValue
          : types[0]?.id ?? ''
      );
    } catch (loadError) {
      console.error('Error loading admin equipment data:', loadError);
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

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      await exportEquipmentQrCodesPdf();
    } finally {
      setExportingPdf(false);
    }
  };

  const equipmentTypeMap = useMemo(
    () =>
      equipmentTypes.reduce<Record<string, EquipmentType>>(
        (result, equipmentType) => {
          result[equipmentType.id] = equipmentType;
          return result;
        },
        {}
      ),
    [equipmentTypes]
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
          equipmentStock,
          equipmentType: equipmentTypeMap[equipmentStock.equipmentTypeId] ?? null,
        })),
    [equipmentStocks, equipmentTypeMap, selectedEquipmentTypeId]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={stockCards}
        keyExtractor={item => item.equipmentStock.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Oprema</Text>
              <Pressable
                style={styles.pdfButton}
                onPress={handleExportPdf}
                disabled={exportingPdf}
              >
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.pdfButtonText}>
                  {exportingPdf ? 'Generisanje...' : 'PDF kodovi'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.description}>
              Ovde mozete dodati tipove opreme i nove lagere tipova ili izmeniti
              postojece.
            </Text>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tipovi opreme</Text>
                <Pressable
                  style={styles.sectionActionButton}
                  onPress={() => router.push('/(admin)/equipment-type-form' as any)}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.sectionAction}>Dodaj tip</Text>
                </Pressable>
              </View>

              {equipmentTypes.length === 0 ? (
                <Text style={styles.emptySectionText}>
                  Jos nema unetih tipova opreme.
                </Text>
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

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lager stavke</Text>
              <Pressable
                style={styles.sectionActionButton}
                onPress={() => router.push('/(admin)/equipment-stock-form' as any)}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.sectionAction}>Dodaj stavku</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : null}

            {!loading && error ? (
              <View style={styles.stateContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!loading && !error && stockCards.length === 0 ? (
              <View style={styles.stateContainer}>
                <Text style={styles.emptySectionText}>
                  Nema lager stavki za izabrani tip opreme.
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          !loading && !error ? (
            <EquipmentStockCard
              equipmentStock={item.equipmentStock}
              equipmentType={item.equipmentType}
              onAdjust={() =>
                router.push({
                  pathname: '/(admin)/equipment-stock-adjust/[stockId]' as any,
                  params: { stockId: item.equipmentStock.id },
                })
              }
            />
          ) : null
        }
        ListFooterComponent={<View style={{ height: Spacing.lg }} />}
      />
    </SafeAreaView>
  );
}

function EquipmentStockCard({
  equipmentStock,
  equipmentType,
  onAdjust,
}: {
  equipmentStock: EquipmentStock;
  equipmentType: EquipmentType | null;
  onAdjust: () => void;
}) {
  const issuedQuantity =
    equipmentStock.totalQuantity - equipmentStock.availableQuantity;

  return (
    <View style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <View style={styles.stockHeaderContent}>
          <Text style={styles.stockTitle}>
            {equipmentType?.name ?? equipmentStock.equipmentTypeId}
          </Text>
          <Text style={styles.stockSubtitle}>
            {equipmentStock.size ? `Velicina ${equipmentStock.size}` : 'Bez velicine'}
          </Text>
        </View>

        <Pressable style={styles.adjustButton} onPress={onAdjust}>
          <Ionicons name="build-outline" size={18} color={Colors.primary} />
          <Text style={styles.adjustButtonText}>Koriguj</Text>
        </Pressable>
      </View>

      <View style={styles.stockMetrics}>
        <MetricItem label="Ukupno" value={String(equipmentStock.totalQuantity)} />
        <MetricItem
          label="Dostupno"
          value={String(equipmentStock.availableQuantity)}
        />
        <MetricItem label="Izdato" value={String(issuedQuantity)} />
      </View>

      <Text style={styles.qrText}>QR token: {equipmentStock.qrToken}</Text>
    </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pdfButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  sectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptySectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
  stateContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  stockCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  stockHeaderContent: {
    flex: 1,
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
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  adjustButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  stockMetrics: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
  qrText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
