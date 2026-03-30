import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import React, { createContext, useEffect, useMemo, useState } from 'react';

import { auth } from '@/firebase/auth';
import { AppUser } from '@/models/User';
import { createUser, getUserById } from '@/services/userService';

type AuthContextType = {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setLoading(true);
      setFirebaseUser(currentUser);

      if (currentUser) {
        const firestoreUser = await getUserById(currentUser.uid);
        setAppUser(firestoreUser);
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      appUser,
      loading,
      signIn: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signUp: async (email: string, password: string) => {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        const createdFirebaseUser = userCredential.user;

        const newAppUser: AppUser = {
          id: createdFirebaseUser.uid,
          email: createdFirebaseUser.email ?? '',
          isActive: true,
          role: 'VOLUNTEER',
          qrToken: createdFirebaseUser.uid,
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'MALE',
          competencyIds: [],
        };

        await createUser(newAppUser);
        setAppUser(newAppUser);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
        setAppUser(null);
      },
    }),
    [firebaseUser, appUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}