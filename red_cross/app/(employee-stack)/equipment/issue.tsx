import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/BackButton';
import CustomButton from '@/components/common/CustomButton';
import CustomInput from '@/components/common/CustomInput';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { EquipmentCategory, EquipmentStock, EquipmentType } from '@/models/Equipment';
import { AppUser, UserRole } from '@/models/User';
import { issueEquipment } from '@/services/equipmentIssueService';
import {
  getAllEquipmentStocks,
  getEquipmentStockByQrToken,
} from '@/services/equipmentStockService';
import { getAllEquipmentTypes } from '@/services/equipmentTypeService';
import { getUserByQrToken } from '@/services/userService';

type ScannerMode = 'USER' | 'STOCK' | null;

type DraftIssueLine = {
  equipmentStockId: string;
  equipmentTypeId: string;
  equipmentTypeName: string;
  size?: string;
  quantity: number;
  availableQuantity: number;
};

export default function IssueEquipmentScreen() {
  const { appUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentStocks, setEquipmentStocks] = useState<EquipmentStock[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [draftLines, setDraftLines] = useState<DraftIssueLine[]>([]);
  const [scannerMode, setScannerMode] = useState<ScannerMode>(null);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [stockPickerVisible, setStockPickerVisible] = useState(false);
  const [manualEquipmentTypeId, setManualEquipmentTypeId] = useState('');
  const [manualEquipmentStockId, setManualEquipmentStockId] = useState('');
  const [manualQuantity, setManualQuantity] = useState('1');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadIssueScreenData();
    }, [])
  );

  const loadIssueScreenData = async () => {
    try {
      const [types, stocks] = await Promise.all([
        getAllEquipmentTypes(),
        getAllEquipmentStocks(),
      ]);

      setEquipmentTypes(types);
      setEquipmentStocks(stocks);
      setManualEquipmentTypeId(currentValue =>
        currentValue || (types[0]?.id ?? '')
      );
    } catch (error) {
      console.error('Error loading issue equipment data:', error);
      Alert.alert('Greska', 'Nije moguce ucitati podatke za izdavanje opreme.');
    } finally {
      setLoading(false);
    }
  };

  const equipmentTypeMap = useMemo(
    () =>
      equipmentTypes.reduce<Record<string, EquipmentType>>((result, equipmentType) => {
        result[equipmentType.id] = equipmentType;
        return result;
      }, {}),
    [equipmentTypes]
  );

  const availableManualStocks = useMemo(
    () =>
      equipmentStocks.filter(
        stock =>
          stock.equipmentTypeId === manualEquipmentTypeId &&
          stock.availableQuantity > 0
      ),
    [equipmentStocks, manualEquipmentTypeId]
  );

  const selectedManualType = useMemo(
    () => equipmentTypes.find(item => item.id === manualEquipmentTypeId) ?? null,
    [equipmentTypes, manualEquipmentTypeId]
  );

  const selectedManualStock = useMemo(
    () => equipmentStocks.find(item => item.id === manualEquipmentStockId) ?? null,
    [equipmentStocks, manualEquipmentStockId]
  );

  const handleOpenScanner = (mode: ScannerMode) => {
    setScannerLocked(false);
    setScannerMode(mode);
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scannerLocked || !scannerMode) {
      return;
    }

    setScannerLocked(true);

    try {
      if (scannerMode === 'USER') {
        const user = await getUserByQrToken(result.data);

        if (!user || !canReceiveEquipment(user.role)) {
          showScannerMessage(
            'Nevalidan QR kod',
            'Skenirani QR kod ne pripada korisniku kome je dozvoljeno izdavanje opreme.',
            () => setScannerLocked(false)
          );
          return;
        }

        setSelectedUser(user);
        setScannerMode(null);
        setScannerLocked(false);
        return;
      }

      const equipmentStock = await getEquipmentStockByQrToken(result.data);

      if (!equipmentStock) {
        showScannerMessage(
          'Nevalidan QR kod',
          'Skenirani QR kod ne pripada lager stavci opreme.',
          () => setScannerLocked(false)
        );
        return;
      }

      const equipmentType = equipmentTypeMap[equipmentStock.equipmentTypeId];

      if (!equipmentType) {
        showScannerMessage(
          'Greska',
          'Nije moguce pronaci tip skenirane opreme.',
          () => setScannerLocked(false)
        );
        return;
      }

      addStockToDraft(equipmentStock, equipmentType, 1);
      setScannerMode(null);
      setScannerLocked(false);
    } catch (error) {
      console.error('Error scanning issue QR code:', error);
      showScannerMessage(
        'Greska',
        'Doslo je do greske prilikom obrade skeniranog QR koda.',
        () => setScannerLocked(false)
      );
    }
  };

  const addStockToDraft = (
    equipmentStock: EquipmentStock,
    equipmentType: EquipmentType,
    quantity: number
  ) => {
    if (quantity <= 0) {
      return;
    }

    setDraftLines(currentLines => {
      const existingLine = currentLines.find(
        line => line.equipmentStockId === equipmentStock.id
      );

      const alreadySelectedQuantity = existingLine?.quantity ?? 0;
      const maxAvailableQuantity = equipmentStock.availableQuantity;

      if (alreadySelectedQuantity + quantity > maxAvailableQuantity) {
        Alert.alert(
          'Nedovoljno opreme',
          'Nije moguce dodati vise komada nego sto je trenutno raspolozivo.'
        );
        return currentLines;
      }

      if (existingLine) {
        return currentLines.map(line =>
          line.equipmentStockId === equipmentStock.id
            ? {
                ...line,
                quantity: line.quantity + quantity,
                availableQuantity: equipmentStock.availableQuantity,
              }
            : line
        );
      }

      return [
        ...currentLines,
        {
          equipmentStockId: equipmentStock.id,
          equipmentTypeId: equipmentType.id,
          equipmentTypeName: equipmentType.name,
          size: equipmentStock.size,
          quantity,
          availableQuantity: equipmentStock.availableQuantity,
        },
      ];
    });
  };

  const handleAddManualItem = () => {
    if (!selectedManualType || !selectedManualStock) {
      Alert.alert('Greska', 'Izaberite tip i lager stavku.');
      return;
    }

    const parsedQuantity = Number.parseInt(manualQuantity, 10);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Greska', 'Kolicina mora biti pozitivan ceo broj.');
      return;
    }

    addStockToDraft(selectedManualStock, selectedManualType, parsedQuantity);
    setManualModalVisible(false);
    setTypePickerVisible(false);
    setStockPickerVisible(false);
    setManualQuantity('1');
    setManualEquipmentStockId('');
  };

  const updateDraftLineQuantity = (
    equipmentStockId: string,
    direction: 'increment' | 'decrement'
  ) => {
    setDraftLines(currentLines =>
      currentLines.flatMap(line => {
        if (line.equipmentStockId !== equipmentStockId) {
          return [line];
        }

        if (direction === 'increment') {
          if (line.quantity >= line.availableQuantity) {
            Alert.alert(
              'Nedovoljno opreme',
              'Nije moguce dodati vise komada nego sto je raspolozivo.'
            );
            return [line];
          }

          return [{ ...line, quantity: line.quantity + 1 }];
        }

        if (line.quantity === 1) {
          return [];
        }

        return [{ ...line, quantity: line.quantity - 1 }];
      })
    );
  };

  const removeDraftLine = (equipmentStockId: string) => {
    setDraftLines(currentLines =>
      currentLines.filter(line => line.equipmentStockId !== equipmentStockId)
    );
  };

  const handleConfirmIssue = async () => {
    if (!appUser) {
      Alert.alert('Greska', 'Nije moguce odrediti prijavljenog zaposlenog.');
      return;
    }

    if (!selectedUser) {
      Alert.alert('Greska', 'Najpre skenirajte QR kod korisnika.');
      return;
    }

    if (draftLines.length === 0) {
      Alert.alert('Greska', 'Dodajte bar jednu stavku na revers.');
      return;
    }

    try {
      setSubmitting(true);

      for (const draftLine of draftLines) {
        await issueEquipment({
          issuedByUserId: appUser.id,
          issuedToUserId: selectedUser.id,
          equipmentStockId: draftLine.equipmentStockId,
          quantity: draftLine.quantity,
        });
      }

      Alert.alert('Uspesno', 'Oprema je uspesno izdata.', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedUser(null);
            setDraftLines([]);
            setManualEquipmentStockId('');
            setManualQuantity('1');
            router.replace('/(employee)/equipment' as any);
          },
        },
      ]);
    } catch (error) {
      console.error('Error confirming equipment issue:', error);
      Alert.alert(
        'Greska',
        error instanceof Error
          ? error.message
          : 'Nije moguce izdati opremu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetManualSelectionForType = (equipmentTypeId: string) => {
    setManualEquipmentTypeId(equipmentTypeId);
    setManualEquipmentStockId('');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Modal
        visible={scannerMode !== null}
        animationType="slide"
        onRequestClose={() => setScannerMode(null)}
      >
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          {!permission ? (
            <View style={styles.centerContent}>
              <Text style={styles.description}>Proverava se dozvola za kameru.</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centerContent}>
              <Text style={styles.title}>Skeniranje QR koda</Text>
              <Text style={styles.description}>
                Dozvolite pristup kameri kako biste mogli da skenirate QR kod.
              </Text>
              <CustomButton title="Dozvoli kameru" onPress={requestPermission} />
            </View>
          ) : (
            <View style={styles.scannerContainer}>
              <Text style={styles.title}>
                {scannerMode === 'USER'
                  ? 'Skeniraj QR kod korisnika'
                  : 'Skeniraj QR kod opreme'}
              </Text>
              <Text style={styles.description}>
                {scannerMode === 'USER'
                  ? 'Usmerite kameru ka QR kodu korisnika kako biste otvorili revers.'
                  : 'Usmerite kameru ka QR kodu lager stavke koju zelite da dodate.'}
              </Text>

              <View style={styles.cameraContainer}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={
                    scannerLocked ? undefined : handleBarcodeScanned
                  }
                />
              </View>

              <Pressable
                style={styles.cancelButton}
                onPress={() => setScannerMode(null)}
              >
                <Text style={styles.cancelButtonText}>Odustani</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dodaj stavku rucno</Text>

            <Pressable
              style={styles.selectorButton}
              onPress={() => setTypePickerVisible(true)}
            >
              <View>
                <Text style={styles.selectorLabel}>Tip opreme</Text>
                <Text style={styles.selectorValue}>
                  {selectedManualType?.name ?? 'Izaberite tip opreme'}
                </Text>
              </View>
              <Ionicons
                name="chevron-down-outline"
                size={18}
                color={Colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={styles.selectorButton}
              onPress={() => setStockPickerVisible(true)}
              disabled={!selectedManualType}
            >
              <View>
                <Text style={styles.selectorLabel}>Lager stavka</Text>
                <Text style={styles.selectorValue}>
                  {selectedManualStock
                    ? selectedManualStock.size
                      ? `Velicina ${selectedManualStock.size}`
                      : 'Bez velicine'
                    : 'Izaberite lager stavku'}
                </Text>
              </View>
              <Ionicons
                name="chevron-down-outline"
                size={18}
                color={Colors.textSecondary}
              />
            </Pressable>

            <CustomInput
              label="Kolicina"
              value={manualQuantity}
              onChangeText={setManualQuantity}
              keyboardType="number-pad"
              placeholder="1"
            />

            <View style={styles.modalActions}>
              <CustomButton title="Dodaj stavku" onPress={handleAddManualItem} />
              <CustomButton
                title="Odustani"
                onPress={() => {
                  setManualModalVisible(false);
                  setTypePickerVisible(false);
                  setStockPickerVisible(false);
                  setManualQuantity('1');
                  setManualEquipmentStockId('');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={typePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Izaberite tip opreme</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {equipmentTypes.map(equipmentType => (
                <Pressable
                  key={equipmentType.id}
                  style={styles.optionItem}
                  onPress={() => {
                    resetManualSelectionForType(equipmentType.id);
                    setTypePickerVisible(false);
                  }}
                >
                  <Text style={styles.optionTitle}>{equipmentType.name}</Text>
                  <Text style={styles.optionSubtitle}>
                    {formatCategory(equipmentType.category)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={stockPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStockPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Izaberite lager stavku</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableManualStocks.map(stock => (
                <Pressable
                  key={stock.id}
                  style={styles.optionItem}
                  onPress={() => {
                    setManualEquipmentStockId(stock.id);
                    setStockPickerVisible(false);
                  }}
                >
                  <Text style={styles.optionTitle}>
                    {stock.size ? `Velicina ${stock.size}` : 'Bez velicine'}
                  </Text>
                  <Text style={styles.optionSubtitle}>
                    Raspolozivo: {stock.availableQuantity}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.replace('/(employee)/equipment' as any)} />
        <Text style={styles.title}>Izdaj opremu</Text>
        <Text style={styles.description}>
          Skenirajte QR kod korisnika, zatim dodajte jednu ili vise stavki na
          revers skeniranjem opreme ili rucnim izborom.
        </Text>

        {loading ? (
          <View style={styles.centerContent}>
            <Text style={styles.description}>Ucitavanje opreme...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Korisnik</Text>
                <Pressable
                  style={styles.inlineAction}
                  onPress={() => handleOpenScanner('USER')}
                >
                  <Ionicons name="scan-outline" size={16} color={Colors.primary} />
                  <Text style={styles.inlineActionText}>Skeniraj</Text>
                </Pressable>
              </View>

              {selectedUser ? (
                <View style={styles.volunteerCard}>
                  <Text style={styles.volunteerName}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Text>
                  <Text style={styles.volunteerSecondaryText}>
                    {formatRole(selectedUser.role)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.emptyHelperText}>
                  Jos nije izabran korisnik za revers.
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Stavke reversa</Text>
              </View>

              <View style={styles.actionCardsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionCard,
                    pressed ? styles.actionCardPressed : null,
                  ]}
                  onPress={() => handleOpenScanner('STOCK')}
                >
                  <View style={styles.actionCardContent}>
                    <Ionicons
                      name="scan-outline"
                      size={22}
                      color={Colors.primary}
                    />
                    <Text style={styles.actionCardTitle}>Skeniraj</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionCard,
                    pressed ? styles.actionCardPressed : null,
                  ]}
                  onPress={() => setManualModalVisible(true)}
                >
                  <View style={styles.actionCardContent}>
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={Colors.primary}
                    />
                    <Text style={styles.actionCardTitle}>Dodaj rucno</Text>
                  </View>
                </Pressable>
              </View>

              {draftLines.length === 0 ? (
                <Text style={styles.emptyHelperText}>
                  Revers je prazan. Dodajte stavke skeniranjem ili rucnim izborom.
                </Text>
              ) : (
                <View style={styles.draftList}>
                  {draftLines.map(line => (
                    <View key={line.equipmentStockId} style={styles.draftCard}>
                      <View style={styles.draftCardHeader}>
                        <View style={styles.draftCardInfo}>
                          <Text style={styles.draftCardTitle}>
                            {line.equipmentTypeName}
                          </Text>
                          <Text style={styles.draftCardSubtitle}>
                            {line.size ? `Velicina ${line.size}` : 'Bez velicine'}
                          </Text>
                        </View>

                        <Pressable
                          style={styles.removeButton}
                          onPress={() => removeDraftLine(line.equipmentStockId)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={Colors.error}
                          />
                        </Pressable>
                      </View>

                      <View style={styles.quantityRow}>
                        <Text style={styles.quantityLabel}>Kolicina</Text>
                        <View style={styles.quantityControls}>
                          <Pressable
                            style={styles.quantityButton}
                            onPress={() =>
                              updateDraftLineQuantity(
                                line.equipmentStockId,
                                'decrement'
                              )
                            }
                          >
                            <Ionicons
                              name="remove-outline"
                              size={18}
                              color={Colors.primary}
                            />
                          </Pressable>

                          <Text style={styles.quantityValue}>{line.quantity}</Text>

                          <Pressable
                            style={styles.quantityButton}
                            onPress={() =>
                              updateDraftLineQuantity(
                                line.equipmentStockId,
                                'increment'
                              )
                            }
                          >
                            <Ionicons
                              name="add-outline"
                              size={18}
                              color={Colors.primary}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <CustomButton
                title="Potvrdi izdavanje"
                onPress={handleConfirmIssue}
                loading={submitting}
                disabled={!selectedUser || draftLines.length === 0}
              />
              <CustomButton
                title="Nazad"
                onPress={() => router.replace('/(employee)/equipment' as any)}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function canReceiveEquipment(role: UserRole) {
  return role !== 'ADMIN';
}

function formatRole(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'EMPLOYEE':
      return 'Zaposleni';
    case 'EXECUTIVE_BOARD':
      return 'Izvrsni odbor';
    case 'INSTRUCTOR':
      return 'Instruktor';
    case 'VOLUNTEER':
      return 'Volonter';
    default:
      return role;
  }
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

function showScannerMessage(
  title: string,
  message: string,
  onPress: () => void
) {
  Alert.alert(title, message, [{ text: 'OK', onPress }], {
    cancelable: false,
  });
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  scannerContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cancelButton: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  volunteerCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryLight,
  },
  volunteerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  volunteerSecondaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyHelperText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    backgroundColor: '#FFF',
    gap: 6,
  },
  actionCardPressed: {
    opacity: 0.85,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  draftList: {
    gap: Spacing.sm,
  },
  draftCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: Spacing.sm,
    backgroundColor: '#FFF',
  },
  draftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  draftCardInfo: {
    flex: 1,
  },
  draftCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  draftCardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quantityLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  quantityValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actions: {
    gap: Spacing.sm,
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
  pickerModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalActions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  selectorLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
