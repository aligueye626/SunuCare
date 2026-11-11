import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { availabilityService } from '@/services/availabilityService';
import { doctorService } from '@/services/doctorService';
import { DAY_AFTER_ISO, TODAY_ISO, TOMORROW_ISO } from '@/services/mockData';
import {
  DoctorAvailabilityConfig,
  DoctorListItem,
  FacilityItem,
} from '@/types/doctor';
import { formatDateShortFr, formatFCFA } from '@/utils/formatters';

export default function DoctorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const patientId = user?.id || 'pat_pre_1';

  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [facility, setFacility] = useState<FacilityItem | null>(null);
  const [availability, setAvailability] =
    useState<DoctorAvailabilityConfig | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>(TODAY_ISO);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoctorProfile = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const doc = await doctorService.getDoctorById(id);
      if (!doc) {
        setError(
          'Ce profil praticien est introuvable ou en attente de vérification.'
        );
        setIsLoading(false);
        return;
      }

      const [availConfig, associatedFacility, favIds] = await Promise.all([
        availabilityService.getDoctorAvailability(doc.id),
        doctorService.findFacilityForDoctor(doc),
        doctorService.getFavoriteDoctorIds(patientId),
      ]);

      setDoctor(doc);
      setAvailability(availConfig);
      setFacility(associatedFacility);
      setIsFavorite(favIds.includes(doc.id));

      const availableDates = doc.availableDates || [
        TODAY_ISO,
        TOMORROW_ISO,
        DAY_AFTER_ISO,
      ];
      if (availableDates.length > 0) {
        setSelectedSlotDate(availableDates[0]);
      }
    } catch (e: any) {
      setError(e.message || 'Impossible de charger le profil du praticien.');
    } finally {
      setIsLoading(false);
    }
  }, [id, patientId]);

  useEffect(() => {
    loadDoctorProfile();
  }, [loadDoctorProfile]);

  const handleToggleFavorite = async () => {
    if (!doctor) return;
    const updatedFavs = await doctorService.toggleFavoriteDoctor(
      patientId,
      doctor.id
    );
    setIsFavorite(updatedFavs.includes(doctor.id));
  };

  const handleCallDoctor = async (phoneStr: string) => {
    const clean = phoneStr.replace(/\s+/g, '');
    try {
      await Linking.openURL(`tel:${clean}`);
    } catch {
      Alert.alert('Contact téléphonique', phoneStr);
    }
  };

  const handleEmailDoctor = async (emailStr: string) => {
    try {
      await Linking.openURL(`mailto:${emailStr}`);
    } catch {
      Alert.alert('Email professionnel', emailStr);
    }
  };

  const handleOpenMapDirections = async () => {
    if (!doctor) return;
    const query = encodeURIComponent(
      `${doctor.clinicName}, ${doctor.address || ''}, ${doctor.district}, Dakar, Sénégal`
    );
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    try {
      await Linking.openURL(url);
    } catch {
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${query}`
      );
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Profil du Médecin" />
        <LoadingIndicator
          fullScreen
          message="Chargement du profil professionnel..."
        />
      </ScreenWrapper>
    );
  }

  if (error || !doctor) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Profil du Médecin" />
        <ErrorState
          title="Profil non disponible"
          message={error || 'Ce médecin ne peut pas être affiché.'}
          onRetry={loadDoctorProfile}
        />
      </ScreenWrapper>
    );
  }

  const consultTypes = doctor.consultationTypes || ['in_person'];
  const slotDates =
    doctor.availableDates && doctor.availableDates.length > 0
      ? doctor.availableDates
      : [TODAY_ISO, TOMORROW_ISO, DAY_AFTER_ISO];

  const slotsForSelectedDate = doctor.availableSlotsByDate?.[
    selectedSlotDate
  ] || ['09:00', '10:30', '15:00', '16:30'];

  const publicPhone = doctor.professionalPhone || '+221 33 889 02 02';
  const publicEmail =
    doctor.publicEmail ||
    `contact@${doctor.clinicName.toLowerCase().replace(/[^a-z0-9]/g, '')}.sn`;

  return (
    <ScreenWrapper>
      <CustomHeader
        showBack
        title="Profil du Médecin"
        rightAction={
          <Pressable
            onPress={handleToggleFavorite}
            hitSlop={10}
            style={({ pressed }) => [
              styles.favoriteButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? Colors.error : Colors.secondaryText}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header Card: Professional Photo, Name, Verified Status, Specialty */}
        <Card padding="lg" style={styles.profileHeaderCard}>
          <Avatar
            name={doctor.fullName}
            uri={doctor.avatarUrl}
            size="xl"
            verified={doctor.verificationStatus === 'verified'}
          />

          <Text style={styles.doctorName}>{doctor.fullName}</Text>
          <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>

          {doctor.subSpecialties && doctor.subSpecialties.length > 0 && (
            <View style={styles.subSpecsWrap}>
              {doctor.subSpecialties.map((sub) => (
                <View key={sub} style={styles.subSpecPill}>
                  <Text style={styles.subSpecText}>{sub}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Verification Badge */}
          <View style={styles.badgeRow}>
            {doctor.verificationStatus === 'verified' ? (
              <Badge label="Praticien Vérifié" variant="verified" />
            ) : (
              <Badge label="En attente de vérification" variant="pending" />
            )}
            <Badge label="Ordre des Médecins SN" variant="secondary" />
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <MaterialCommunityIcons
                  name="star"
                  size={16}
                  color={Colors.accentGold}
                />
                <Text style={styles.statValue}>{doctor.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>{doctor.reviewCount} avis</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {doctor.experienceYears || 10}+ ans
              </Text>
              <Text style={styles.statLabel}>Expérience</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatFCFA(doctor.consultationFeeFCFA)}
              </Text>
              <Text style={styles.statLabel}>Consultation</Text>
            </View>
          </View>
        </Card>

        {/* 2. Available Slots (Interactive Preview) */}
        <Card padding="md" style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Créneaux disponibles à la réservation
            </Text>
            <Badge
              label={`${availability?.consultationDurationMinutes || 30} min / RDV`}
              variant="primary"
              size="sm"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateTabsRow}
          >
            {slotDates.map((dateIso) => {
              const isSelected = selectedSlotDate === dateIso;
              const label =
                dateIso === TODAY_ISO
                  ? "Aujourd'hui"
                  : dateIso === TOMORROW_ISO
                    ? 'Demain'
                    : formatDateShortFr(dateIso);
              return (
                <Pressable
                  key={dateIso}
                  onPress={() => setSelectedSlotDate(dateIso)}
                  style={[
                    styles.dateTabChip,
                    isSelected && styles.dateTabChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateTabText,
                      isSelected && styles.dateTabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.slotsGrid}>
            {slotsForSelectedDate.map((timeStr) => (
              <Pressable
                key={timeStr}
                onPress={() =>
                  router.push({
                    pathname: `/booking/${doctor.id}` as any,
                    params: { date: selectedSlotDate, slot: timeStr },
                  })
                }
                style={({ pressed }) => [
                  styles.slotButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={15}
                  color={Colors.primary}
                />
                <Text style={styles.slotButtonText}>{timeStr}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* 3. Consultation Prices & Consultation Types */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>
            Tarifs & Modes de Consultation
          </Text>

          <View style={styles.priceBox}>
            <View>
              <Text style={styles.priceLabel}>
                Consultation médicale standard
              </Text>
              <Text style={styles.priceSub}>
                Espèces, Wave ou Orange Money au cabinet
              </Text>
            </View>
            <Text style={styles.priceAmount}>
              {formatFCFA(doctor.consultationFeeFCFA)}
            </Text>
          </View>

          <View style={styles.consultTypesRow}>
            {consultTypes.includes('in_person') && (
              <View style={styles.consultTypeBadge}>
                <MaterialCommunityIcons
                  name="hospital-building"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.consultTypeText}>
                  Consultation au cabinet ({doctor.district})
                </Text>
              </View>
            )}
            {consultTypes.includes('teleconsultation') && (
              <View style={styles.consultTypeBadge}>
                <MaterialCommunityIcons
                  name="video-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.consultTypeText}>
                  Téléconsultation vidéo disponible
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* 4. Associated Facility in Dakar */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>
            Établissement de santé associé à Dakar
          </Text>
          <View style={styles.locationRow}>
            <View style={styles.locationIconBox}>
              <MaterialCommunityIcons
                name="hospital-building"
                size={24}
                color={Colors.primary}
              />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.clinicName}>{doctor.clinicName}</Text>
              <Text style={styles.clinicAddress}>
                {doctor.address || `Quartier ${doctor.district}`},{' '}
                {doctor.district}, Dakar
              </Text>
              <Text style={styles.slotAvailableText}>
                Prochain créneau :{' '}
                {doctor.nextAvailableSlot || 'Disponible cette semaine'}
              </Text>
            </View>
          </View>

          <View style={styles.facilityActionsRow}>
            {facility && (
              <SecondaryButton
                title="Voir la fiche clinique"
                size="sm"
                onPress={() => router.push(`/facility/${facility.id}`)}
                style={{ flex: 1 }}
              />
            )}
            <SecondaryButton
              title="Itinéraire GPS"
              size="sm"
              onPress={handleOpenMapDirections}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* 5. Biography & Qualifications */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>Biographie & Parcours Médical</Text>
          <Text style={styles.bioText}>
            {doctor.bio ||
              `Médecin spécialiste en ${doctor.specialty} engagé pour la santé des patients à Dakar (${doctor.clinicName}, quartier ${doctor.district}).`}
          </Text>

          {doctor.education && doctor.education.length > 0 && (
            <View style={styles.educationList}>
              {doctor.education.map((item) => (
                <View key={item} style={styles.educationItem}>
                  <MaterialCommunityIcons
                    name="school-outline"
                    size={18}
                    color={Colors.primary}
                    style={{ marginTop: 2 }}
                  />
                  <Text style={styles.educationText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* 6. Working Hours */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>Horaires d’ouverture du cabinet</Text>
          {doctor.workingHoursSummary && (
            <View style={styles.workingSummaryBox}>
              <MaterialCommunityIcons
                name="clock-check-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.workingSummaryText}>
                {doctor.workingHoursSummary}
              </Text>
            </View>
          )}

          {availability?.weeklySchedule && (
            <View style={styles.scheduleTable}>
              {availability.weeklySchedule.map((day) => (
                <View key={day.dayName} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDayName}>{day.dayName}</Text>
                  <Text
                    style={[
                      styles.scheduleHoursText,
                      !day.isEnabled && { color: Colors.secondaryText },
                    ]}
                  >
                    {day.isEnabled && day.slots.length > 0
                      ? day.slots.join('  •  ')
                      : 'Fermé'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* 7. Public Contact Details & Languages */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>
            Coordonnées de Contact Public & Langues
          </Text>

          <Pressable
            onPress={() => handleCallDoctor(publicPhone)}
            style={styles.contactRow}
          >
            <MaterialCommunityIcons
              name="phone-in-talk-outline"
              size={20}
              color={Colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>
                Secrétariat médical (Dakar)
              </Text>
              <Text style={styles.contactValue}>{publicPhone}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.secondaryText}
            />
          </Pressable>

          <Pressable
            onPress={() => handleEmailDoctor(publicEmail)}
            style={styles.contactRow}
          >
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
              color={Colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Email professionnel public</Text>
              <Text style={styles.contactValue}>{publicEmail}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.secondaryText}
            />
          </Pressable>

          <View style={styles.chipRow}>
            {(doctor.languages || ['Français', 'Wolof']).map((lang) => (
              <View key={lang} style={styles.langChip}>
                <MaterialCommunityIcons
                  name="translate"
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.langChipText}>{lang}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Fixed Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomFeeContainer}>
          <Text style={styles.bottomFeeLabel}>Tarif consultation</Text>
          <Text style={styles.bottomFeeValue}>
            {formatFCFA(doctor.consultationFeeFCFA)}
          </Text>
        </View>

        <PrimaryButton
          title="Prendre rendez-vous"
          onPress={() => router.push(`/booking/${doctor.id}`)}
          size="md"
          rightIcon={
            <MaterialCommunityIcons
              name="calendar-plus"
              size={18}
              color={Colors.white}
            />
          }
          style={styles.bookButton}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.base,
    paddingBottom: 110,
  },
  favoriteButton: {
    padding: Spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  profileHeaderCard: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  doctorName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  doctorSpecialty: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  subSpecsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  subSpecPill: {
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  subSpecText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  card: {
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  dateTabsRow: {
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  dateTabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateTabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateTabText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  dateTabTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 4,
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.25)',
  },
  slotButtonText: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  priceLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  priceSub: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  priceAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  consultTypesRow: {
    gap: Spacing.xs,
  },
  consultTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  consultTypeText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  locationDetails: {
    flex: 1,
  },
  clinicName: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  clinicAddress: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  slotAvailableText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semiBold,
    marginTop: 3,
  },
  facilityActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  bioText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: Typography.lineHeight.sm + 4,
  },
  educationList: {
    gap: Spacing.xs + 2,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  educationText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.text,
    flex: 1,
    lineHeight: Typography.lineHeight.xs + 2,
  },
  workingSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  workingSummaryText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primaryDark,
    flex: 1,
  },
  scheduleTable: {
    gap: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  scheduleDayName: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    width: 90,
  },
  scheduleHoursText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  contactLabel: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
  },
  contactValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  langChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.medium,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.md,
  },
  bottomFeeContainer: {
    flex: 1,
  },
  bottomFeeLabel: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
  },
  bottomFeeValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  bookButton: {
    flex: 1.4,
  },
});
