import React, { useCallback, useState } from 'react';
import {
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
import { SpecialtyCard } from '@/components/common/SpecialtyCard';
import { FacilityCard } from '@/components/common/FacilityCard';
import { DoctorCard } from '@/components/doctors/DoctorCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import { doctorService } from '@/services/doctorService';
import { notificationService } from '@/services/notificationService';
import { Appointment } from '@/types/appointment';
import {
  DoctorListItem,
  FacilityItem,
  SpecialtyCategoryItem,
} from '@/types/doctor';
import { formatDateShortFr, formatFCFA } from '@/utils/formatters';

export default function PatientHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [featuredDoctors, setFeaturedDoctors] = useState<DoctorListItem[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyCategoryItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [favoriteDoctorIds, setFavoriteDoctorIds] = useState<string[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const patientId = user?.id || 'pat_pre_1';
  const firstName = user?.firstName || 'Fatou';
  const fullName = user?.fullName || 'Fatou Diop';
  const patientDistrict =
    (user?.role === 'patient' && user.district) || 'Dakar, Sénégal';

  const loadDashboardData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [upcoming, verifiedDocs, specs, facs, favDocIds, unreadCount] = await Promise.all([
          appointmentService.getUpcomingPatientAppointment(patientId),
          doctorService.getVerifiedDoctors(),
          doctorService.getSpecialties(),
          doctorService.getFacilities(),
          doctorService.getFavoriteDoctorIds(patientId),
          notificationService.getUnreadCount(patientId, patientId),
        ]);

        setUpcomingAppointment(upcoming);
        setFavoriteDoctorIds(favDocIds);
        setUnreadNotificationsCount(unreadCount);
        // Only verified doctors are returned by doctorService.getVerifiedDoctors()
        setFeaturedDoctors(
          verifiedDocs.slice(0, 4).map((d: DoctorListItem) => ({
            ...d,
            isFavorite: favDocIds.includes(d.id),
          }))
        );
        setSpecialties(specs);
        setFacilities(facs.slice(0, 3));
      } catch (e: any) {
        setError(e.message || 'Impossible de charger les données du tableau de bord.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [patientId]
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboardData(false);
    }, [loadDashboardData])
  );

  const handleToggleFavorite = async (doctorId: string) => {
    const updatedFavs = await doctorService.toggleFavoriteDoctor(patientId, doctorId);
    setFavoriteDoctorIds(updatedFavs);
    setFeaturedDoctors((prev) =>
      prev.map((doc) => ({
        ...doc,
        isFavorite: updatedFavs.includes(doc.id),
      }))
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingIndicator
          fullScreen
          message="Chargement de votre espace santé à Dakar..."
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState
          title="Erreur de connexion"
          message={error}
          onRetry={() => loadDashboardData(false)}
        />
      </SafeAreaView>
    );
  }

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
              loadDashboardData(true);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Top Personalized Welcome & Dakar Location */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.locationPill}>
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={15}
                color={Colors.primary}
              />
              <Text style={styles.locationText}>
                {patientDistrict.includes('Dakar')
                  ? patientDistrict
                  : `${patientDistrict}, Dakar`}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={14}
                color={Colors.secondaryText}
              />
            </View>
            <Text style={styles.greeting}>Bonjour, {firstName} 👋</Text>
            <Text style={styles.subGreeting}>
              Votre santé, plus proche de vous à Dakar
            </Text>
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
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatarButton}
              accessibilityLabel="Mon profil patient"
            >
              <Avatar
                name={fullName}
                uri={user?.avatarUrl}
                size="md"
                isOnline
              />
            </Pressable>
          </View>
        </View>

        {/* Interactive Search Bar */}
        <Pressable
          onPress={() => router.push('/(tabs)/search')}
          style={({ pressed }) => [
            styles.searchBanner,
            pressed && { opacity: 0.9 },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={Colors.primary}
          />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Rechercher un médecin, une spécialité ou clinique à Dakar...
          </Text>
          <View style={styles.filterMiniBadge}>
            <MaterialCommunityIcons
              name="tune-variant"
              size={16}
              color={Colors.primary}
            />
          </View>
        </Pressable>

        {/* Upcoming Appointment Preview Section */}
        <SectionHeader
          title="Prochain rendez-vous"
          subtitle="Votre suivi médical programmé"
          actionText="Tous mes RDV"
          onActionPress={() => router.push('/(tabs)/appointments')}
        />

        {upcomingAppointment ? (
          <Pressable
            onPress={() => router.push(`/appointments/${upcomingAppointment.id}`)}
            style={({ pressed }) => [
              styles.upcomingCard,
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={styles.upcomingTopRow}>
              <View style={styles.upcomingDoctorRow}>
                <Avatar
                  name={upcomingAppointment.doctorName}
                  size="md"
                  verified
                  backgroundColor="rgba(255,255,255,0.2)"
                />
                <View style={styles.upcomingDoctorInfo}>
                  <Text style={styles.upcomingDoctorName}>
                    {upcomingAppointment.doctorName}
                  </Text>
                  <Text style={styles.upcomingSpecialty}>
                    {upcomingAppointment.doctorSpecialty} •{' '}
                    {upcomingAppointment.clinicName}
                  </Text>
                </View>
              </View>
              <Badge
                label={
                  upcomingAppointment.status === 'confirmed'
                    ? 'Confirmé'
                    : 'En attente'
                }
                variant={
                  upcomingAppointment.status === 'confirmed'
                    ? 'success'
                    : 'warning'
                }
                size="sm"
              />
            </View>

            <View style={styles.upcomingDivider} />

            <View style={styles.upcomingMetaRow}>
              <View style={styles.upcomingMetaItem}>
                <MaterialCommunityIcons
                  name="calendar-month"
                  size={16}
                  color={Colors.white}
                />
                <Text style={styles.upcomingMetaText}>
                  {formatDateShortFr(upcomingAppointment.date)}
                </Text>
              </View>

              <View style={styles.upcomingMetaItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={Colors.white}
                />
                <Text style={styles.upcomingMetaText}>
                  {upcomingAppointment.time}
                </Text>
              </View>

              <View style={styles.upcomingMetaItem}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={16}
                  color={Colors.white}
                />
                <Text style={styles.upcomingMetaText}>
                  {upcomingAppointment.district}
                </Text>
              </View>

              <Text style={styles.upcomingFeeText}>
                {formatFCFA(upcomingAppointment.feeFCFA)}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.noUpcomingCard}>
            <View style={styles.noUpcomingIconCircle}>
              <MaterialCommunityIcons
                name="calendar-plus"
                size={24}
                color={Colors.primary}
              />
            </View>
            <View style={styles.noUpcomingContent}>
              <Text style={styles.noUpcomingTitle}>
                Aucun rendez-vous à venir
              </Text>
              <Text style={styles.noUpcomingSubtitle}>
                Réservez une consultation en quelques clics auprès d’un praticien vérifié à Dakar.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              style={styles.noUpcomingBtn}
            >
              <Text style={styles.noUpcomingBtnText}>Prendre RDV</Text>
            </Pressable>
          </View>
        )}

        {/* Medical Specialty Categories */}
        <SectionHeader
          title="Spécialités médicales"
          subtitle="Consultez par domaine de compétence"
          actionText="Voir tout"
          onActionPress={() => router.push('/(tabs)/search')}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtiesList}
        >
          {specialties.map((spec) => (
            <SpecialtyCard
              key={spec.id}
              specialty={spec}
              onPress={() =>
                router.push(
                  `/(tabs)/search?specialty=${encodeURIComponent(spec.name)}`
                )
              }
            />
          ))}
        </ScrollView>

        {/* Featured Verified Doctors */}
        <SectionHeader
          title="Médecins recommandés à Dakar"
          subtitle="Profils vérifiés par l’Ordre des Médecins du Sénégal"
          actionText="Voir tout"
          onActionPress={() => router.push('/(tabs)/search')}
        />

        {featuredDoctors.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            onPress={() => router.push(`/doctor/${doctor.id}`)}
            onFavoriteToggle={() => handleToggleFavorite(doctor.id)}
          />
        ))}

        {/* Nearby Healthcare Facilities */}
        <SectionHeader
          title="Établissements de santé proches"
          subtitle="Cliniques, hôpitaux et cabinets partenaires à Dakar"
          actionText="Explorer"
          onActionPress={() => router.push('/(tabs)/search')}
        />

        {facilities.map((facility) => (
          <FacilityCard
            key={facility.id}
            facility={facility}
            onPress={() => router.push(`/facility/${facility.id}`)}
          />
        ))}

        {/* Dakar Emergency Info Pill */}
        <View style={styles.emergencyPill}>
          <MaterialCommunityIcons
            name="phone-alert"
            size={18}
            color="#C2410C"
          />
          <Text style={styles.emergencyText}>
            Urgences médicales Dakar : SAMU National (1515) • Pompiers (18) • SOS Médecins (+221 33 889 15 15)
          </Text>
        </View>
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
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: 6,
    gap: 4,
  },
  locationText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primaryDark,
  },
  greeting: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  subGreeting: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  avatarButton: {
    borderRadius: 28,
  },
  searchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.secondaryText,
    flex: 1,
  },
  filterMiniBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  upcomingDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
    marginRight: Spacing.xs,
  },
  upcomingDoctorInfo: {
    flex: 1,
  },
  upcomingDoctorName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  upcomingSpecialty: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  upcomingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: Spacing.sm + 2,
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  upcomingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingMetaText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.white,
  },
  upcomingFeeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#FDE68A',
  },
  noUpcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  noUpcomingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noUpcomingContent: {
    flex: 1,
  },
  noUpcomingTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  noUpcomingSubtitle: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  noUpcomingBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  noUpcomingBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  specialtiesList: {
    paddingBottom: Spacing.md,
  },
  emergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  emergencyText: {
    fontSize: Typography.fontSize.xs,
    color: '#9A3412',
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
});
