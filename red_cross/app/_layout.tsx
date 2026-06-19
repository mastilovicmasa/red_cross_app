import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';

function RootNavigation() {
  const { firebaseUser, emailVerified, appUser, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthScreen =
      segments[0] === 'login' || segments[0] === 'register';
    const inVerifyEmailScreen = segments[0] === 'verify-email';

    const inAdminGroup = segments[0] === '(admin)';
    const inUserCompetenciesScreen = segments[0] === 'user-competencies';
    const inEmployeeGroup = segments[0] === '(employee)';
    const inInstructorGroup = segments[0] === '(instructor)';
    const inSharedProtectedScreen =
      segments[0] === 'create-activity' ||
      segments[0] === 'edit-activity' ||
      segments[0] === 'invite-volunteers' ||
      segments[0] === 'activity-responses' ||
      segments[0] === 'activity-reports' ||
      segments[0] === 'invitation' ||
      segments[0] === 'volunteer-activity' ||
      segments[0] === 'activity' ||
      segments[0] === 'scan-attendance' ||
      segments[0] === 'edit-profile' ||
      segments[0] === 'manage-competencies' ||
      segments[0] === 'qr-code';
    const isEmployeeLikeRole =
      appUser?.role === 'EMPLOYEE' || appUser?.role === 'EXECUTIVE_BOARD';

    if (!firebaseUser && !inAuthScreen) {
      router.replace('/login');
      return;
    }

    if (firebaseUser && !emailVerified) {
      if (!inVerifyEmailScreen) {
        router.replace('/verify-email');
      }
      return;
    }

    if (firebaseUser && emailVerified && inVerifyEmailScreen && appUser) {
      if (appUser.role === 'ADMIN') {
        router.replace('/(admin)' as any);
      } else if (isEmployeeLikeRole) {
        router.replace('/(employee)' as any);
      } else if (appUser.role === 'INSTRUCTOR') {
        router.replace('/(instructor)' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
      return;
    }

    if (firebaseUser && appUser && inAuthScreen) {
      if (appUser.role === 'ADMIN') {
        router.replace('/(admin)' as any);
      } else if (isEmployeeLikeRole) {
        router.replace('/(employee)' as any);
      } else if (appUser.role === 'INSTRUCTOR') {
        router.replace('/(instructor)' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
      return;
    }

    if (firebaseUser && appUser) {
      if (
        appUser.role === 'ADMIN' &&
        !inAdminGroup &&
        !inUserCompetenciesScreen
      ) {
        router.replace('/(admin)' as any);
        return;
      }

      if (
        isEmployeeLikeRole &&
        !inEmployeeGroup &&
        !inUserCompetenciesScreen &&
        !inSharedProtectedScreen
      ) {
        router.replace('/(employee)' as any);
        return;
      }

      if (
        appUser.role === 'INSTRUCTOR' &&
        !inInstructorGroup &&
        !inSharedProtectedScreen
      ) {
        router.replace('/(instructor)' as any);
        return;
      }

      if (
        appUser.role !== 'ADMIN' &&
        !isEmployeeLikeRole &&
        appUser.role !== 'INSTRUCTOR' &&
        (inAdminGroup || inEmployeeGroup || inInstructorGroup)
      ) {
        router.replace('/(tabs)' as any);
        return;
      }
    }
  }, [firebaseUser, emailVerified, appUser, loading, segments, router]);

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
