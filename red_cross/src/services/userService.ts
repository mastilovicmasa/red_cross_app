import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { AppUser } from '@/models/User';

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