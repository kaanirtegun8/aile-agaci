import { Stack } from 'expo-router';
import { TouchableOpacity, Text, Platform } from 'react-native';
import { router } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="addRelation"
        options={{
          presentation: 'modal',
          title: 'Bağlantı Ekle',
          headerTitleAlign: 'center',
          headerLeft: Platform.OS === 'ios' ? () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Text style={{ color: '#007AFF', fontSize: 17 }}>Geri</Text>
            </TouchableOpacity>
          ) : undefined
        }}
      />
      <Stack.Screen
        name="relationSettings"
        options={{
          presentation: 'modal',
          title: 'Bağlantı Ayarları',
          headerTitleAlign: 'center',
          headerLeft: Platform.OS === 'ios' ? () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Text style={{ color: '#007AFF', fontSize: 17 }}>Geri</Text>
            </TouchableOpacity>
          ) : undefined
        }}
      />
      <Stack.Screen
        name="relationDetail"
        options={{
          presentation: 'modal',
          title: 'Bağlantı Detayları',
          headerTitleAlign: 'center',
          headerLeft: Platform.OS === 'ios' ? () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Text style={{ color: '#007AFF', fontSize: 17 }}>Geri</Text>
            </TouchableOpacity>
          ) : undefined
        }}
      />
    </Stack>
  );
} 