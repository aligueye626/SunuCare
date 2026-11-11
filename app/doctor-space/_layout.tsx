import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function DoctorSpaceLayout() {
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
        name="dashboard"
        options={{
          title: 'Tableau de bord Médecin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="appointments"
        options={{
          title: 'Gestion des Rendez-vous',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="availability"
        options={{
          title: 'Disponibilités & Horaires',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Mon Profil Praticien',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

