import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const { firebaseUser, appUser, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View>
      <Text>Home screen</Text>
      <Text>Firebase user email: {firebaseUser?.email ?? 'No firebase user'}</Text>
      <Text>App user email: {appUser?.email ?? 'No app user'}</Text>
      <Text>Role: {appUser?.role ?? 'No role'}</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}