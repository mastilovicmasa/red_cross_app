import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { EquipmentStock } from '@/models/Equipment';

export async function createEquipmentStock(
  equipmentStock: EquipmentStock
): Promise<void> {
  if (equipmentStock.availableQuantity > equipmentStock.totalQuantity) {
    throw new Error(
      'Dostupna kolicina ne moze biti veca od ukupne kolicine.'
    );
  }

  const equipmentStockRef = doc(db, 'equipmentStocks', equipmentStock.id);
  const existingStockSnapshot = await getDoc(equipmentStockRef);

  if (existingStockSnapshot.exists()) {
    throw new Error('Lager stavka sa zadatim identifikatorom vec postoji.');
  }

  const existingStockWithQrToken = await getEquipmentStockByQrToken(
    equipmentStock.qrToken
  );

  if (existingStockWithQrToken) {
    throw new Error('QR kod je vec dodeljen drugoj lager stavci.');
  }

  const existingStocksByType = await getEquipmentStocksByType(
    equipmentStock.equipmentTypeId
  );
  const normalizedIncomingSize = (equipmentStock.size ?? '').trim().toUpperCase();
  const duplicateStock = existingStocksByType.find(
    stock => (stock.size ?? '').trim().toUpperCase() === normalizedIncomingSize
  );

  if (duplicateStock) {
    throw new Error('Lager stavka za izabrani tip i veličinu već postoji.');
  }

  await setDoc(equipmentStockRef, equipmentStock);
}

export async function updateEquipmentStock(
  equipmentStockId: string,
  data: Partial<EquipmentStock>
): Promise<void> {
  if (
    data.totalQuantity !== undefined &&
    data.availableQuantity !== undefined &&
    data.availableQuantity > data.totalQuantity
  ) {
    throw new Error(
      'Dostupna kolicina ne moze biti veca od ukupne kolicine.'
    );
  }

  const equipmentStockRef = doc(db, 'equipmentStocks', equipmentStockId);
  await updateDoc(equipmentStockRef, data);
}

export async function getEquipmentStockById(
  equipmentStockId: string
): Promise<EquipmentStock | null> {
  const equipmentStockRef = doc(db, 'equipmentStocks', equipmentStockId);
  const snapshot = await getDoc(equipmentStockRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as EquipmentStock;
}

export async function getEquipmentStockByQrToken(
  qrToken: string
): Promise<EquipmentStock | null> {
  const equipmentStocksRef = collection(db, 'equipmentStocks');
  const stockQuery = query(equipmentStocksRef, where('qrToken', '==', qrToken));
  const snapshot = await getDocs(stockQuery);

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as EquipmentStock;
}

export async function getAllEquipmentStocks(): Promise<EquipmentStock[]> {
  const snapshot = await getDocs(collection(db, 'equipmentStocks'));

  return snapshot.docs
    .map(document => document.data() as EquipmentStock)
    .sort((first, second) => first.equipmentTypeId.localeCompare(second.equipmentTypeId));
}

export async function getEquipmentStocksByType(
  equipmentTypeId: string
): Promise<EquipmentStock[]> {
  const equipmentStocksRef = collection(db, 'equipmentStocks');
  const stockQuery = query(
    equipmentStocksRef,
    where('equipmentTypeId', '==', equipmentTypeId)
  );
  const snapshot = await getDocs(stockQuery);

  return snapshot.docs
    .map(document => document.data() as EquipmentStock)
    .sort((first, second) => (first.size ?? '').localeCompare(second.size ?? ''));
}

export async function increaseEquipmentStockQuantity(
  equipmentStockId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Kolicina za povecanje mora biti veca od nule.');
  }

  const equipmentStockRef = doc(db, 'equipmentStocks', equipmentStockId);

  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(equipmentStockRef);

    if (!snapshot.exists()) {
      throw new Error('Lager stavka ne postoji.');
    }

    const equipmentStock = snapshot.data() as EquipmentStock;

    transaction.update(equipmentStockRef, {
      totalQuantity: equipmentStock.totalQuantity + amount,
      availableQuantity: equipmentStock.availableQuantity + amount,
    });
  });
}

export async function decreaseEquipmentStockQuantity(
  equipmentStockId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) {
    throw new Error('Kolicina za smanjenje mora biti veca od nule.');
  }

  const equipmentStockRef = doc(db, 'equipmentStocks', equipmentStockId);

  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(equipmentStockRef);

    if (!snapshot.exists()) {
      throw new Error('Lager stavka ne postoji.');
    }

    const equipmentStock = snapshot.data() as EquipmentStock;
    const nextTotalQuantity = equipmentStock.totalQuantity - amount;
    const issuedQuantity =
      equipmentStock.totalQuantity - equipmentStock.availableQuantity;

    if (nextTotalQuantity < 0) {
      throw new Error('Ukupna kolicina ne moze biti negativna.');
    }

    if (nextTotalQuantity < issuedQuantity) {
      throw new Error(
        'Nije moguce smanjiti lager ispod broja trenutno izdatih komada.'
      );
    }

    transaction.update(equipmentStockRef, {
      totalQuantity: nextTotalQuantity,
      availableQuantity: nextTotalQuantity - issuedQuantity,
    });
  });
}
