import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Redirect } from 'expo-router';

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#007AFF',
      headerShown: false,
      tabBarStyle: {
        height: Platform.OS === 'ios' ? 88 : 60,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hesabım',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
