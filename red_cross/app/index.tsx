import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View>
      <Text>Home screen</Text>
      <Text>{user?.email ?? 'No user'}</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}