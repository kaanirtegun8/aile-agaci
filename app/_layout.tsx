import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import AuthProvider, { useAuth } from './context/AuthContext';

function RootLayoutNav() {
  const { loading } = useAuth();

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="(modal)"
        options={{
          headerShown: false,
          presentation: Platform.OS === 'ios' ? 'modal' : 'card',
          animation: 'slide_from_right'
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
