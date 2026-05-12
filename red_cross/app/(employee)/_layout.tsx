import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Image, Alert, Pressable } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

export default function EmployeeTabsLayout() {
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Odjava', 'Da li želite da se odjavite?', [
      { text: 'Otkaži', style: 'cancel' },
      {
        text: 'Odjavi se',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTitleAlign: 'center',
        headerTitle: () => (
          <Image
            source={require('../../assets/images/Logo-CKNS.jpg')}
            style={{ width: 120, height: 40, resizeMode: 'contain' }}
          />
        ),
        headerRight: () => (
          <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </Pressable>
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Početna',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="activities"
        options={{
          title: 'Aktivnosti',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="competencies"
        options={{
          title: 'Kompetencije',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ribbon-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="volunteers"
        options={{
          title: 'Volonteri',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}