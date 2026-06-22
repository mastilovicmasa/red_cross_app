import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';

function RootNavigation() {
  const { firebaseUser, emailVerified, appUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const lastRedirectRef = useRef<string | null>(null);

  const redirectTo = (targetPath: string) => {
    if (pathname === targetPath || lastRedirectRef.current === targetPath) {
      return;
    }

    lastRedirectRef.current = targetPath;
    router.replace(targetPath as any);
  };

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [pathname]);

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
    const roleRootPath =
      appUser?.role === 'ADMIN'
        ? '/(admin)'
        : isEmployeeLikeRole
          ? '/(employee)'
          : appUser?.role === 'INSTRUCTOR'
            ? '/(instructor)'
            : '/(tabs)';

    if (!firebaseUser && !inAuthScreen) {
      redirectTo('/login');
      return;
    }

    if (firebaseUser && !emailVerified) {
      if (!inVerifyEmailScreen) {
        redirectTo('/verify-email');
      }
      return;
    }

    if (firebaseUser && emailVerified && inVerifyEmailScreen && appUser) {
      redirectTo(roleRootPath);
      return;
    }

    if (firebaseUser && appUser && inAuthScreen) {
      redirectTo(roleRootPath);
      return;
    }

    if (firebaseUser && appUser) {
      if (
        appUser.role === 'ADMIN' &&
        !inAdminGroup &&
        !inUserCompetenciesScreen
      ) {
        redirectTo('/(admin)');
        return;
      }

      if (
        isEmployeeLikeRole &&
        !inEmployeeGroup &&
        !inUserCompetenciesScreen &&
        !inSharedProtectedScreen
      ) {
        redirectTo('/(employee)');
        return;
      }

      if (
        appUser.role === 'INSTRUCTOR' &&
        !inInstructorGroup &&
        !inSharedProtectedScreen
      ) {
        redirectTo('/(instructor)');
        return;
      }

      if (
        appUser.role !== 'ADMIN' &&
        !isEmployeeLikeRole &&
        appUser.role !== 'INSTRUCTOR' &&
        (inAdminGroup || inEmployeeGroup || inInstructorGroup)
      ) {
        redirectTo('/(tabs)');
        return;
      }
    }
  }, [firebaseUser, emailVerified, appUser, loading, segments, pathname, router]);

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
