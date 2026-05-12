import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { AppUser } from '@/models/User';


export async function getAllUsers(): Promise<AppUser[]> {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  return snapshot.docs.map(document => document.data() as AppUser);
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

  return userSnapshot.data() as AppUser;
}

export async function updateUser(
  userId: string,
  data: Partial<AppUser>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
}