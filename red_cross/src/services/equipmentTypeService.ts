import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { EquipmentType } from '@/models/Equipment';

export async function createEquipmentType(
  equipmentType: EquipmentType
): Promise<void> {
  const equipmentTypeRef = doc(db, 'equipmentTypes', equipmentType.id);
  await setDoc(equipmentTypeRef, equipmentType);
}

export async function updateEquipmentType(
  equipmentTypeId: string,
  data: Partial<EquipmentType>
): Promise<void> {
  const equipmentTypeRef = doc(db, 'equipmentTypes', equipmentTypeId);
  await updateDoc(equipmentTypeRef, data);
}

export async function getEquipmentTypeById(
  equipmentTypeId: string
): Promise<EquipmentType | null> {
  const equipmentTypeRef = doc(db, 'equipmentTypes', equipmentTypeId);
  const snapshot = await getDoc(equipmentTypeRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as EquipmentType;
}

export async function getAllEquipmentTypes(): Promise<EquipmentType[]> {
  const snapshot = await getDocs(collection(db, 'equipmentTypes'));

  return snapshot.docs
    .map(document => document.data() as EquipmentType)
    .sort((first, second) => first.name.localeCompare(second.name));
}
