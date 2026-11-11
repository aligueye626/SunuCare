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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import { availabilityService } from '@/services/availabilityService';
import { notificationService } from '@/services/notificationService';
import { TODAY_ISO } from '@/services/mockData';
import { Appointment } from '@/types/appointment';
import { DoctorAvailabilityConfig } from '@/types/doctor';
import { DoctorProfile } from '@/types/user';
import { formatDateShortFr, formatFCFA } from '@/utils/formatters';

export default function DoctorDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const doctor = user as DoctorProfile | null;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] =
    useState<DoctorAvailabilityConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const doctorId = doctor?.id || 'doc_pre_1';
  const doctorName = doctor?.fullName || 'Dr. Aïssatou Ndiaye';
  const specialty = doctor?.specialty || 'Cardiologie';
  const facility = doctor?.facilityName || 'Clinique du Cap';
  const district = doctor?.facilityDistrict || 'Plateau';
  const licenseNumber = doctor?.licenseNumber || 'OM-SN-2012-0482';
  const isVerified = doctor?.verificationStatus === 'verified';

  const loadDoctorDashboard = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [apts, avail, unreadCount] = await Promise.all([
          appointmentService.getDoctorAppointments(doctorId),
          availabilityService.getDoctorAvailability(doctorId),
          notificationService.getUnreadCount(doctorId, doctorId),
        ]);
        setAppointments(apts);
        setAvailability(avail);
        setUnreadNotificationsCount(unreadCount);
      } catch (e: any) {
        setError(
          e.message || 'Impossible de charger votre tableau de bord praticien.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [doctorId]
  );

  useFocusEffect(
    useCallback(() => {
      loadDoctorDashboard(false);
    }, [loadDoctorDashboard])
  );

  // Derived dashboard metrics & lists
  const todayAppointments = appointments.filter(
    (a) =>
      a.date === TODAY_ISO &&
      (a.status === 'confirmed' || a.status === 'pending')
  );
  const pendingRequests = appointments.filter((a) => a.status === 'pending');
  const confirmedAppointments = appointments.filter(
    (a) => a.status === 'confirmed'
  );
  const upcomingSchedule = appointments
    .filter(
      (a) =>
        a.date >= TODAY_ISO &&
        (a.status === 'confirmed' || a.status === 'pending')
    )
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  const handleQuickConfirm = async (apt: Appointment) => {
    setProcessingId(apt.id);
    const { error: confirmError } = await appointmentService.confirmAppointment(
      apt.id,
      doctorId
    );
    setProcessingId(null);

    if (confirmError) {
      Alert.alert('Impossible de confirmer', confirmError);
      return;
    }

    await loadDoctorDashboard(true);
    Alert.alert(
      'Rendez-vous confirmé',
      `La consultation de ${apt.patientName || 'votre patient'} le ${formatDateShortFr(apt.date)} à ${apt.time} est confirmée.`
    );
  };

  const handleQuickReject = (apt: Appointment) => {
    Alert.alert(
      'Refuser cette demande ?',
      `Souhaitez-vous décliner la demande de ${apt.patientName || 'ce patient'} du ${formatDateShortFr(apt.date)} à ${apt.time} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser la demande',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(apt.id);
            const { error: rejectError } =
              await appointmentService.rejectAppointment(
                apt.id,
                'Créneau indisponible au planning du praticien',
                doctorId
              );
            setProcessingId(null);
            if (rejectError) {
              Alert.alert('Erreur', rejectError);
            } else {
              await loadDoctorDashboard(true);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Quitter l’Espace Praticien SunuCare ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingIndicator
          fullScreen
          message="Chargement de votre tableau de bord médical..."
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
          onRetry={() => loadDoctorDashboard(false)}
        />
      </SafeAreaView>
    );
  }

  const openDaysCount =
    availability?.weeklySchedule.filter((d) => d.isEnabled).length ?? 5;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadDoctorDashboard(true);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Top Welcome Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerGreeting}>
              Bienvenue dans votre Espace Praticien
            </Text>
            <Text style={styles.doctorName}>
              {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
            </Text>
            <View style={styles.specialtyRow}>
              <MaterialCommunityIcons
                name="stethoscope"
                size={15}
                color={Colors.primary}
              />
              <Text style={styles.specialtyClinic}>
                {specialty} • {facility} ({district}, Dakar)
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => router.push('/notifications' as any)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: Colors.white,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              accessibilityLabel="Centre de notifications"
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={Colors.primary}
              />
              {unreadNotificationsCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: Colors.error,
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: '800',
                    }}
                  >
                    {unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/doctor-space/profile')}
              hitSlop={10}
            >
              <Avatar
                name={doctorName}
                uri={doctor?.avatarUrl}
                size="md"
                verified={isVerified}
              />
            </Pressable>
          </View>
        </View>

        {/* Verification Status Banner */}
        {isVerified ? (
          <Card padding="md" style={styles.verifiedCard}>
            <View style={styles.verificationRow}>
              <View style={styles.verifiedBadgeCircle}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={26}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.verificationTextContainer}>
                <View style={styles.verificationTitleRow}>
                  <Text style={styles.verifiedTitle}>
                    Statut Professionnel : Vérifié
                  </Text>
                  <Badge label="Public & Actif" variant="verified" size="sm" />
                </View>
                <Text style={styles.verificationDesc}>
                  N° d’Ordre : {licenseNumber}. Votre profil est visible dans les recherches publiques des patients à Dakar.
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card padding="md" style={styles.pendingCard}>
            <View style={styles.verificationRow}>
              <View style={styles.pendingBadgeCircle}>
                <MaterialCommunityIcons
                  name="clock-alert-outline"
                  size={26}
                  color={Colors.warning}
                />
              </View>
              <View style={styles.verificationTextContainer}>
                <View style={styles.verificationTitleRow}>
                  <Text style={styles.pendingTitle}>
                    Statut : En attente de vérification
                  </Text>
                  <Badge label="Non public" variant="pending" size="sm" />
                </View>
                <Text style={styles.verificationDesc}>
                  Vous avez accès à l’intégralité de votre tableau de bord professionnel pour préparer votre profil et vos horaires, mais votre fiche n’apparaît pas encore dans les résultats de recherche publics.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* 4 Key Dashboard Counters: Today's, Pending, Confirmed, Upcoming */}
        <View style={styles.statsRow}>
          <Pressable
            onPress={() => router.push('/doctor-space/appointments')}
            style={styles.statMetricCard}
          >
            <View
              style={[
                styles.statIconBadge,
                { backgroundColor: Colors.secondaryLight },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-today"
                size={20}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.statNumber}>{todayAppointments.length}</Text>
            <Text style={styles.statTitle}>RDV Aujourd’hui</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/doctor-space/appointments')}
            style={styles.statMetricCard}
          >
            <View
              style={[
                styles.statIconBadge,
                { backgroundColor: Colors.accentGoldLight },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-alert-outline"
                size={20}
                color={Colors.accentGold}
              />
            </View>
            <Text style={styles.statNumber}>{pendingRequests.length}</Text>
            <Text style={styles.statTitle}>Demandes</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/doctor-space/appointments')}
            style={styles.statMetricCard}
          >
            <View
              style={[
                styles.statIconBadge,
                { backgroundColor: Colors.successLight },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-check"
                size={20}
                color={Colors.success}
              />
            </View>
            <Text style={styles.statNumber}>
              {confirmedAppointments.length}
            </Text>
            <Text style={styles.statTitle}>Confirmés</Text>
          </Pressable>
        </View>

        {/* Quick Navigation Bar for Doctor Modules */}
        <SectionHeader
          title="Gestion du cabinet"
          subtitle="Accès direct à vos modules professionnels"
        />
        <View style={styles.actionsGrid}>
          <Pressable
            onPress={() => router.push('/doctor-space/appointments')}
            style={({ pressed }) => [
              styles.actionTile,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: Colors.secondaryLight },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-multiselect"
                size={24}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.actionTileTitle}>Rendez-vous</Text>
            <Text style={styles.actionTileSubtitle}>
              {pendingRequests.length} à confirmer • {confirmedAppointments.length} validés
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/doctor-space/availability')}
            style={({ pressed }) => [
              styles.actionTile,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: '#E0F7F4' },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-edit-outline"
                size={24}
                color={Colors.primaryDark}
              />
            </View>
            <Text style={styles.actionTileTitle}>Disponibilités</Text>
            <Text style={styles.actionTileSubtitle}>
              {openDaysCount} j/sem • {availability?.consultationDurationMinutes || 30} min/RDV
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/doctor-space/profile')}
            style={({ pressed }) => [
              styles.actionTile,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: '#FEF3C7' },
              ]}
            >
              <MaterialCommunityIcons
                name="account-details-outline"
                size={24}
                color="#D97706"
              />
            </View>
            <Text style={styles.actionTileTitle}>Profil Professionnel</Text>
            <Text style={styles.actionTileSubtitle}>
              {formatFCFA(doctor?.consultationFeeFCFA || 25000)} • Bio & Cabinet
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/search')}
            style={({ pressed }) => [
              styles.actionTile,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: Colors.surfaceMuted },
              ]}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={24}
                color={Colors.secondaryText}
              />
            </View>
            <Text style={styles.actionTileTitle}>Annuaire Public</Text>
            <Text style={styles.actionTileSubtitle}>
              Vérifier l’affichage patient
            </Text>
          </Pressable>
        </View>

        {/* SECTION 1: Today's Appointments */}
        <SectionHeader
          title={`Rendez-vous d’aujourd’hui (${todayAppointments.length})`}
          subtitle={`Consultations du jour (${formatDateShortFr(TODAY_ISO)})`}
          actionText="Gérer"
          onActionPress={() => router.push('/doctor-space/appointments')}
        />

        {todayAppointments.length > 0 ? (
          todayAppointments.map((apt) => (
            <Card key={apt.id} padding="md" style={styles.appointmentItemCard}>
              <View style={styles.aptHeaderRow}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{apt.time}</Text>
                </View>
                <View style={styles.aptInfo}>
                  <Text style={styles.patientName}>
                    {apt.patientName || 'Patient SunuCare'}
                  </Text>
                  <Text style={styles.aptReason} numberOfLines={1}>
                    {apt.reason || 'Consultation médicale'} •{' '}
                    {apt.consultationType === 'teleconsultation'
                      ? 'Téléconsultation'
                      : 'Au cabinet'}
                  </Text>
                </View>
                <Badge
                  label={
                    apt.status === 'confirmed' ? 'Confirmé' : 'En attente'
                  }
                  variant={apt.status === 'confirmed' ? 'verified' : 'pending'}
                  size="sm"
                />
              </View>
            </Card>
          ))
        ) : (
          <Card padding="md" style={styles.emptySectionCard}>
            <Text style={styles.emptySectionText}>
              Aucune consultation programmée pour aujourd’hui.
            </Text>
          </Card>
        )}

        {/* SECTION 2: Pending Requests */}
        <SectionHeader
          title={`Demandes en attente (${pendingRequests.length})`}
          subtitle="Demandes de patients nécessitant votre validation"
          actionText="Tout voir"
          onActionPress={() => router.push('/doctor-space/appointments')}
        />

        {pendingRequests.length > 0 ? (
          pendingRequests.slice(0, 3).map((req) => (
            <Card key={req.id} padding="md" style={styles.pendingRequestCard}>
              <View style={styles.aptHeaderRow}>
                <Avatar name={req.patientName || 'Patient'} size="sm" />
                <View style={styles.aptInfo}>
                  <Text style={styles.patientName}>
                    {req.patientName || 'Patient SunuCare'}
                  </Text>
                  <Text style={styles.aptReason}>
                    {formatDateShortFr(req.date)} à {req.time} •{' '}
                    {formatFCFA(req.feeFCFA)}
                  </Text>
                  {req.reason && (
                    <Text style={styles.requestReasonText} numberOfLines={2}>
                      Motif : {req.reason}
                    </Text>
                  )}
                </View>
                <Badge label="À valider" variant="pending" size="sm" />
              </View>

              <View style={styles.quickActionRow}>
                <SecondaryButton
                  title="Refuser"
                  size="sm"
                  onPress={() => handleQuickReject(req)}
                  disabled={processingId === req.id}
                  style={{ flex: 1, borderColor: Colors.error }}
                  textStyle={{ color: Colors.error }}
                />
                <PrimaryButton
                  title="Confirmer"
                  size="sm"
                  loading={processingId === req.id}
                  onPress={() => handleQuickConfirm(req)}
                  style={{ flex: 1.4 }}
                />
              </View>
            </Card>
          ))
        ) : (
          <Card padding="md" style={styles.emptySectionCard}>
            <Text style={styles.emptySectionText}>
              Aucune demande en attente de validation.
            </Text>
          </Card>
        )}

        {/* SECTION 3: Confirmed Appointments & Upcoming Schedule */}
        <SectionHeader
          title={`Planning à venir (${upcomingSchedule.length})`}
          subtitle={`${confirmedAppointments.length} rendez-vous confirmé(s) au total`}
          actionText="Calendrier"
          onActionPress={() => router.push('/doctor-space/availability')}
        />

        {upcomingSchedule.length > 0 ? (
          upcomingSchedule.slice(0, 4).map((apt) => (
            <Card key={apt.id} padding="md" style={styles.appointmentItemCard}>
              <View style={styles.aptHeaderRow}>
                <View style={styles.dateColumnBadge}>
                  <Text style={styles.dateColumnDay}>
                    {formatDateShortFr(apt.date)}
                  </Text>
                  <Text style={styles.dateColumnTime}>{apt.time}</Text>
                </View>
                <View style={styles.aptInfo}>
                  <Text style={styles.patientName}>
                    {apt.patientName || 'Patient SunuCare'}
                  </Text>
                  <Text style={styles.aptReason} numberOfLines={1}>
                    {apt.patientPhone || '+221 77 000 00 00'} •{' '}
                    {apt.consultationType === 'teleconsultation'
                      ? 'Téléconsultation'
                      : 'Cabinet'}
                  </Text>
                </View>
                <Badge
                  label={
                    apt.status === 'confirmed' ? 'Confirmé' : 'En attente'
                  }
                  variant={apt.status === 'confirmed' ? 'verified' : 'pending'}
                  size="sm"
                />
              </View>
            </Card>
          ))
        ) : (
          <Card padding="md" style={styles.emptySectionCard}>
            <Text style={styles.emptySectionText}>
              Aucun rendez-vous programmé sur les prochains jours.
            </Text>
          </Card>
        )}

        {/* Doctor Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="logout"
            size={18}
            color={Colors.error}
          />
          <Text style={styles.logoutText}>
            Se déconnecter de l’Espace Praticien
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  headerGreeting: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doctorName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  specialtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  specialtyClinic: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    flex: 1,
  },
  verifiedCard: {
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.25)',
    marginBottom: Spacing.md,
  },
  pendingCard: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.35)',
    marginBottom: Spacing.md,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  verifiedBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  verifiedTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    flex: 1,
  },
  pendingTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: '#854D0E',
    flex: 1,
  },
  verificationDesc: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.text,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statMetricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statNumber: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statTitle: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.medium,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionTile: {
    width: '48.5%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionTileTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  actionTileSubtitle: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  appointmentItemCard: {
    marginBottom: Spacing.sm,
  },
  pendingRequestCard: {
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentGold,
  },
  aptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeBadge: {
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  timeBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  dateColumnBadge: {
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    minWidth: 74,
  },
  dateColumnDay: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semiBold,
  },
  dateColumnTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 1,
  },
  aptInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  aptReason: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  requestReasonText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.text,
    marginTop: 3,
    fontStyle: 'italic',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  emptySectionCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.lg,
  },
  logoutText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.error,
  },
});
