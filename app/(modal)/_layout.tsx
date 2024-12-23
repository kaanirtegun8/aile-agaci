import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="editProfile"
        options={{
          presentation: 'modal',
          headerTitle: 'Profili Düzenle',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
} 