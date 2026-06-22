import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, Alert, Pressable } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

export default function TabsLayout() {
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Odjava',
      'Da li želite da se odjavite?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Odjavi se',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
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
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
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
        name="users"
        options={{
          title: 'Korisnici',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
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
        name="equipment"
        options={{
          title: 'Oprema',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="equipment-type-form"
        options={{
          href: null,
          title: 'Novi tip opreme',
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="equipment-stock-form"
        options={{
          href: null,
          title: 'Nova lager stavka',
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="equipment-stock-adjust/[stockId]"
        options={{
          href: null,
          title: 'Korekcija lagera',
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
