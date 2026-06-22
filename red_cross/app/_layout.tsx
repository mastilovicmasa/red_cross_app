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
    const inAdminStackGroup = segments[0] === '(admin-stack)';
    const inEmployeeGroup = segments[0] === '(employee)';
    const inEmployeeStackGroup = segments[0] === '(employee-stack)';
    const inInstructorGroup = segments[0] === '(instructor)';
    const inSharedGroup = segments[0] === '(shared)';
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
        !inAdminStackGroup &&
        !inSharedGroup
      ) {
        redirectTo('/(admin)');
        return;
      }

      if (
        isEmployeeLikeRole &&
        !inEmployeeGroup &&
        !inEmployeeStackGroup &&
        !inSharedGroup
      ) {
        redirectTo('/(employee)');
        return;
      }

      if (
        appUser.role === 'INSTRUCTOR' &&
        !inInstructorGroup &&
        !inSharedGroup
      ) {
        redirectTo('/(instructor)');
        return;
      }

      if (
        appUser.role !== 'ADMIN' &&
        !isEmployeeLikeRole &&
        appUser.role !== 'INSTRUCTOR' &&
        (
          inAdminGroup ||
          inAdminStackGroup ||
          inEmployeeGroup ||
          inEmployeeStackGroup ||
          inInstructorGroup
        )
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
