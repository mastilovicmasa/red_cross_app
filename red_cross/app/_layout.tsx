import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';

function RootNavigation() {
  const { firebaseUser, appUser, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthScreen =
      segments[0] === 'login' || segments[0] === 'register';

    const inAdminGroup = segments[0] === '(admin)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!firebaseUser && !inAuthScreen) {
      router.replace('/login');
      return;
    }

    if (firebaseUser && appUser && inAuthScreen) {
      if (appUser.role === 'ADMIN') {
        router.replace('/(admin)' as any);
      } else {
        router.replace('/(tabs)');
      }

      return;
    }

    if (firebaseUser && appUser) {
      if (appUser.role === 'ADMIN' && !inAdminGroup) {
        router.replace('/(admin)' as any);
        return;
      }

      if (appUser.role !== 'ADMIN' && inAdminGroup) {
        router.replace('/(tabs)');
        return;
      }
    }
  }, [firebaseUser, appUser, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}