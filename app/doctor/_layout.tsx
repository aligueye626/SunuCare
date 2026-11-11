import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function DoctorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.white,
        },
        headerTintColor: Colors.primary,
        headerTitleStyle: {
          fontWeight: '700',
          color: Colors.text,
        },
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Profil du Praticien',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

