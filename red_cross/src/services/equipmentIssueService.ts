import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { EquipmentIssue, EquipmentStock } from '@/models/Equipment';

type IssueEquipmentParams = {
  issuedByUserId: string;
  issuedToUserId: string;
  equipmentStockId: string;
  quantity?: number;
};

export async function getEquipmentIssueById(
  equipmentIssueId: string
): Promise<EquipmentIssue | null> {
  const equipmentIssueRef = doc(db, 'equipmentIssues', equipmentIssueId);
  const snapshot = await getDoc(equipmentIssueRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as EquipmentIssue;
}

export async function issueEquipment({
  issuedByUserId,
  issuedToUserId,
  equipmentStockId,
  quantity = 1,
}: IssueEquipmentParams): Promise<EquipmentIssue[]> {
  if (quantity <= 0) {
    throw new Error('Kolicina za izdavanje mora biti veca od nule.');
  }

  const equipmentStockRef = doc(db, 'equipmentStocks', equipmentStockId);
  const equipmentIssuesRef = collection(db, 'equipmentIssues');

  return runTransaction(db, async transaction => {
    const stockSnapshot = await transaction.get(equipmentStockRef);

    if (!stockSnapshot.exists()) {
      throw new Error('Lager stavka ne postoji.');
    }

    const equipmentStock = stockSnapshot.data() as EquipmentStock;

    if (equipmentStock.availableQuantity < quantity) {
      throw new Error('Nema dovoljno dostupne opreme na lageru.');
    }

    const issuedAt = new Date().toISOString();
    const createdIssues: EquipmentIssue[] = [];

    for (let index = 0; index < quantity; index += 1) {
      const equipmentIssueRef = doc(equipmentIssuesRef);
      const equipmentIssue: EquipmentIssue = {
        id: equipmentIssueRef.id,
        issuedAt,
        issuedByUserId,
        issuedToUserId,
        equipmentStockId,
      };

      transaction.set(equipmentIssueRef, equipmentIssue);
      createdIssues.push(equipmentIssue);
    }

    transaction.update(equipmentStockRef, {
      availableQuantity: equipmentStock.availableQuantity - quantity,
    });

    return createdIssues;
  });
}

export async function returnEquipment(
  equipmentIssueId: string
): Promise<void> {
  const equipmentIssueRef = doc(db, 'equipmentIssues', equipmentIssueId);

  await runTransaction(db, async transaction => {
    const equipmentIssueSnapshot = await transaction.get(equipmentIssueRef);

    if (!equipmentIssueSnapshot.exists()) {
      throw new Error('Zaduzenje opreme ne postoji.');
    }

    const equipmentIssue = equipmentIssueSnapshot.data() as EquipmentIssue;

    if (equipmentIssue.closedAt) {
      throw new Error('Oprema je vec razduzena.');
    }

    const equipmentStockRef = doc(
      db,
      'equipmentStocks',
      equipmentIssue.equipmentStockId
    );
    const equipmentStockSnapshot = await transaction.get(equipmentStockRef);

    if (!equipmentStockSnapshot.exists()) {
      throw new Error('Lager stavka ne postoji.');
    }

    const equipmentStock = equipmentStockSnapshot.data() as EquipmentStock;

    transaction.update(equipmentIssueRef, {
      closedAt: new Date().toISOString(),
    });
    transaction.update(equipmentStockRef, {
      availableQuantity: equipmentStock.availableQuantity + 1,
    });
  });
}

export async function getOpenEquipmentIssuesByUser(
  userId: string
): Promise<EquipmentIssue[]> {
  const equipmentIssuesRef = collection(db, 'equipmentIssues');
  const issueQuery = query(
    equipmentIssuesRef,
    where('issuedToUserId', '==', userId)
  );
  const snapshot = await getDocs(issueQuery);

  return snapshot.docs
    .map(document => document.data() as EquipmentIssue)
    .filter(issue => !issue.closedAt)
    .sort((first, second) => first.issuedAt.localeCompare(second.issuedAt));
}

export async function getEquipmentIssueHistoryByUser(
  userId: string
): Promise<EquipmentIssue[]> {
  const equipmentIssuesRef = collection(db, 'equipmentIssues');
  const issueQuery = query(
    equipmentIssuesRef,
    where('issuedToUserId', '==', userId)
  );
  const snapshot = await getDocs(issueQuery);

  return snapshot.docs
    .map(document => document.data() as EquipmentIssue)
    .sort((first, second) => first.issuedAt.localeCompare(second.issuedAt));
}

export async function getOpenEquipmentIssuesByStock(
  equipmentStockId: string
): Promise<EquipmentIssue[]> {
  const equipmentIssuesRef = collection(db, 'equipmentIssues');
  const issueQuery = query(
    equipmentIssuesRef,
    where('equipmentStockId', '==', equipmentStockId)
  );
  const snapshot = await getDocs(issueQuery);

  return snapshot.docs
    .map(document => document.data() as EquipmentIssue)
    .filter(issue => !issue.closedAt)
    .sort((first, second) => first.issuedAt.localeCompare(second.issuedAt));
}

export async function getAllOpenEquipmentIssues(): Promise<EquipmentIssue[]> {
  const snapshot = await getDocs(collection(db, 'equipmentIssues'));

  return snapshot.docs
    .map(document => document.data() as EquipmentIssue)
    .filter(issue => !issue.closedAt)
    .sort((first, second) => first.issuedAt.localeCompare(second.issuedAt));
}
