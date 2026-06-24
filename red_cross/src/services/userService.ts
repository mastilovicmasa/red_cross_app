import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { AppUser, UserRole } from '@/models/User';

function mapUserDocument(document: {
  id: string;
  data: () => Omit<AppUser, 'id'> & Partial<Pick<AppUser, 'id'>>;
}): AppUser {
  return {
    ...document.data(),
    id: document.id,
  } as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  return snapshot.docs.map(mapUserDocument);
}

export async function getUsersByRole(role: UserRole): Promise<AppUser[]> {
  const usersQuery = query(collection(db, 'users'), where('role', '==', role));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map(mapUserDocument);
}

export async function getUsersByIds(userIds: string[]): Promise<AppUser[]> {
  if (userIds.length === 0) {
    return [];
  }

  const uniqueUserIds = [...new Set(userIds)];
  const chunks: string[][] = [];

  for (let index = 0; index < uniqueUserIds.length; index += 10) {
    chunks.push(uniqueUserIds.slice(index, index + 10));
  }

  const snapshots = await Promise.all(
    chunks.map(chunk =>
      getDocs(
        query(collection(db, 'users'), where(documentId(), 'in', chunk))
      )
    )
  );

  return snapshots.flatMap(snapshot =>
    snapshot.docs.map(mapUserDocument)
  );
}

export async function getUsersByRoles(roles: UserRole[]): Promise<AppUser[]> {
  if (roles.length === 0) {
    return [];
  }

  const uniqueRoles = [...new Set(roles)];
  const snapshots = await Promise.all(
    uniqueRoles.map(role => getUsersByRole(role))
  );

  return snapshots.flat();
}

export async function getActivityInviteCandidates(): Promise<AppUser[]> {
  const users = await getUsersByRoles([
    'VOLUNTEER',
    'INSTRUCTOR',
    'EXECUTIVE_BOARD',
  ]);

  return users.filter(user => user.isActive);
}

export async function createUser(user: AppUser): Promise<void> {
  const userRef = doc(db, 'users', user.id);
  await setDoc(userRef, user);
}

export async function getUserById(userId: string): Promise<AppUser | null> {
  const userRef = doc(db, 'users', userId);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  return mapUserDocument(userSnapshot);
}

export async function getUserByQrToken(
  qrToken: string
): Promise<AppUser | null> {
  const usersRef = collection(db, 'users');
  const usersQuery = query(usersRef, where('qrToken', '==', qrToken));
  const snapshot = await getDocs(usersQuery);

  if (snapshot.empty) {
    return null;
  }

  return mapUserDocument(snapshot.docs[0]);
}

export async function updateUser(
  userId: string,
  data: Partial<AppUser>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
}
