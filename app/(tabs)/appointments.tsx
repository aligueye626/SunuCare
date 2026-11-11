import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { AppointmentCard } from '@/components/common/AppointmentCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import { Appointment } from '@/types/appointment';
import { formatDateShortFr } from '@/utils/formatters';

type AppointmentTab = 'upcoming' | 'past' | 'cancelled';

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patientId = user?.id || 'pat_pre_1';

  const loadAppointments = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const list = await appointmentService.getPatientAppointments(patientId);
        setAppointments(list);
      } catch (e: any) {
        setError(e.message || 'Impossible de récupérer vos rendez-vous.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [patientId]
  );

  useFocusEffect(
    useCallback(() => {
      loadAppointments(false);
    }, [loadAppointments])
  );

  const handleCancelAppointment = (apt: Appointment) => {
    Alert.alert(
      'Annuler ce rendez-vous ?',
      `Souhaitez-vous vraiment annuler votre consultation avec ${apt.doctorName} prévue le ${formatDateShortFr(apt.date)} à ${apt.time} ? Le créneau sera immédiatement libéré.`,
      [
        { text: 'Conserver', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            const { error: cancelError } =
              await appointmentService.cancelAppointment(
                apt.id,
                'patient',
                'Annulé par le patient depuis son espace',
                patientId
              );
            if (cancelError) {
              Alert.alert('Erreur', cancelError);
            } else {
              await loadAppointments(true);
              Alert.alert(
                'Rendez-vous annulé',
                'Votre rendez-vous a été annulé et le créneau horaire a été libéré.'
              );
            }
          },
        },
      ]
    );
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (activeTab === 'upcoming') {
      return apt.status === 'confirmed' || apt.status === 'pending';
    }
    if (activeTab === 'past') {
      return apt.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return apt.status === 'cancelled' || apt.status === 'rejected';
    }
    return true;
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingIndicator
          fullScreen
          message="Chargement de vos rendez-vous..."
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState
          title="Erreur de chargement"
          message={error}
          onRetry={() => loadAppointments(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes rendez-vous</Text>
        <Text style={styles.subtitle}>
          Consultez le statut et gérez vos consultations médicales à Dakar
        </Text>

        {/* 3-Way Tabs */}
        <View style={styles.tabToggleRow}>
          <Pressable
            onPress={() => setActiveTab('upcoming')}
            style={[
              styles.toggleBtn,
              activeTab === 'upcoming' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                activeTab === 'upcoming' && styles.toggleTextActive,
              ]}
            >
              À venir (
              {
                appointments.filter(
                  (a) => a.status === 'confirmed' || a.status === 'pending'
                ).length
              }
              )
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('past')}
            style={[
              styles.toggleBtn,
              activeTab === 'past' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                activeTab === 'past' && styles.toggleTextActive,
              ]}
            >
              Passés (
              {appointments.filter((a) => a.status === 'completed').length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('cancelled')}
            style={[
              styles.toggleBtn,
              activeTab === 'cancelled' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                activeTab === 'cancelled' && styles.toggleTextActive,
              ]}
            >
              Annulés (
              {
                appointments.filter(
                  (a) => a.status === 'cancelled' || a.status === 'rejected'
                ).length
              }
              )
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Appointment List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadAppointments(true);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              onPress={() => router.push(`/appointments/${apt.id}`)}
              onDoctorProfilePress={() =>
                router.push(`/doctor/${apt.doctorId}`)
              }
              onDirectionsPress={() => router.push(`/appointments/${apt.id}`)}
              onCancelPress={() => handleCancelAppointment(apt)}
            />
          ))
        ) : (
          <EmptyState
            title={
              activeTab === 'upcoming'
                ? 'Aucun rendez-vous à venir'
                : activeTab === 'past'
                  ? 'Aucun historique de consultation'
                  : 'Aucun rendez-vous annulé'
            }
            description={
              activeTab === 'upcoming'
                ? 'Vous n’avez aucun rendez-vous planifié. Trouvez un praticien vérifié à Dakar dès aujourd’hui.'
                : 'Vos consultations médicales précédentes apparaîtront ici.'
            }
            actionTitle={
              activeTab === 'upcoming' ? 'Prendre rendez-vous' : undefined
            }
            onActionPress={
              activeTab === 'upcoming'
                ? () => router.push('/(tabs)/search')
                : undefined
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginBottom: Spacing.md,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 3,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.white,
  },
  toggleText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
});
