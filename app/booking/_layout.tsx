import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function BookingLayout() {
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
        name="[doctorId]"
        options={{
          title: 'Réservation',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

