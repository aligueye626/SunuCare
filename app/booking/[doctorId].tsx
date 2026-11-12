import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { CustomInput } from '@/components/common/CustomInput';
import { Avatar } from '@/components/common/Avatar';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDateShortFr, formatFCFA } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import {
  Appointment,
  BookableDateItem,
  ConsultationType,
  getAppointmentStatusLabel,
} from '@/types/appointment';
import { DoctorListItem } from '@/types/doctor';

export default function AppointmentBookingScreen() {
  const {
    doctorId,
    date: initialDateParam,
    slot: initialSlotParam,
  } = useLocalSearchParams<{
    doctorId: string;
    date?: string;
    slot?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [bookableDates, setBookableDates] = useState<BookableDateItem[]>([]);
  const [selectedDateItem, setSelectedDateItem] =
    useState<BookableDateItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(
    initialSlotParam || null
  );
  const [consultationType, setConsultationType] =
    useState<ConsultationType>('in_person');
  const [reason, setReason] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 9: Confirmed booking receipt state
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<Appointment | null>(null);

  const loadBookingSchedule = useCallback(async () => {
    if (!doctorId) {
      setLoadError('Identifiant du praticien manquant.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const {
        doctor: verifiedDoc,
        dates,
        error,
      } = await appointmentService.getBookableDatesForDoctor(doctorId, 7);

      if (error || !verifiedDoc) {
        setLoadError(
          error ||
            'Ce praticien n’est pas disponible pour la prise de rendez-vous.'
        );
        setDoctor(null);
        setBookableDates([]);
        return;
      }

      setDoctor(verifiedDoc);
      setBookableDates(dates);

      // Default consultation type based on doctor's supported types
      if (
        Array.isArray(verifiedDoc.consultationTypes) &&
        verifiedDoc.consultationTypes.length > 0 &&
        !verifiedDoc.consultationTypes.includes('in_person')
      ) {
        setConsultationType(verifiedDoc.consultationTypes[0]);
      }

      // Select initial date (from route param or first date with available slots)
      let targetDate = dates[0] || null;
      if (initialDateParam) {
        const matched = dates.find((d) => d.date === initialDateParam);
        if (matched) targetDate = matched;
      } else {
        const firstOpen = dates.find(
          (d) => !d.isBlocked && d.availableCount > 0
        );
        if (firstOpen) targetDate = firstOpen;
      }

      setSelectedDateItem(targetDate);

      if (targetDate) {
        if (
          initialSlotParam &&
          targetDate.slots.some(
            (s) => s.time === initialSlotParam && s.isAvailable
          )
        ) {
          setSelectedSlot(initialSlotParam);
        } else {
          const firstFree = targetDate.slots.find((s) => s.isAvailable);
          setSelectedSlot(firstFree ? firstFree.time : null);
        }
      }
    } catch (e: any) {
      setLoadError(
        e.message || 'Impossible de récupérer les disponibilités du praticien.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [doctorId, initialDateParam, initialSlotParam]);

  useEffect(() => {
    loadBookingSchedule();
  }, [loadBookingSchedule]);

  const handleSelectDate = (dateItem: BookableDateItem) => {
    setBookingError(null);
    setSelectedDateItem(dateItem);
    const firstAvailable = dateItem.slots.find((s) => s.isAvailable);
    setSelectedSlot(firstAvailable ? firstAvailable.time : null);
  };

  const handleOpenPreview = () => {
    setBookingError(null);
    if (!selectedDateItem || selectedDateItem.isBlocked) {
      setBookingError(
        'Veuillez sélectionner un jour où le cabinet est ouvert.'
      );
      return;
    }
    if (!selectedSlot) {
      setBookingError(
        'Veuillez sélectionner un créneau horaire disponible pour continuer.'
      );
      return;
    }
    setIsConfirmModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!doctor || !selectedDateItem || !selectedSlot) return;

    setBookingError(null);
    setIsSubmitting(true);

    const patientId = user?.id || 'pat_pre_1';
    const actorRole = user?.role === 'doctor' ? 'doctor' : 'patient';

    const { appointment, error } = await appointmentService.createAppointment({
      patientId,
      patientName: user?.fullName || 'Fatou Diop',
      patientPhone: user?.phone || '+221 77 987 65 43',
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      doctorSpecialty: doctor.specialty,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.address || `${doctor.district}, Dakar`,
      district: doctor.district,
      date: selectedDateItem.date,
      time: selectedSlot,
      type: consultationType,
      consultationType,
      feeFCFA: doctor.consultationFeeFCFA,
      reason: reason.trim() || 'Consultation médicale programmée',
      actorId: patientId,
      actorRole,
    });

    setIsSubmitting(false);
    setIsConfirmModalVisible(false);

    if (error || !appointment) {
      setBookingError(
        error || 'Impossible d’enregistrer ce rendez-vous pour le moment.'
      );
      // Refresh slots so any newly taken slot is marked unavailable
      await loadBookingSchedule();
      Alert.alert(
        'Réservation refusée',
        error || 'Ce créneau n’est plus disponible.'
      );
      return;
    }

    setConfirmedAppointment(appointment);
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Réserver une consultation" />
        <LoadingIndicator
          fullScreen
          message="Vérification en temps réel des créneaux disponibles..."
        />
      </ScreenWrapper>
    );
  }

  if (loadError || !doctor) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Réserver une consultation" />
        <ErrorState
          title="Réservation indisponible"
          message={
            loadError ||
            'Ce praticien ne peut pas recevoir de réservations actuellement.'
          }
          onRetry={loadBookingSchedule}
        />
      </ScreenWrapper>
    );
  }

  // STEP 9: BOOKING CONFIRMATION RECEIPT SCREEN
  if (confirmedAppointment) {
    return (
      <ScreenWrapper scrollable>
        <CustomHeader
          showBack
          title="Confirmation de réservation"
          onBackPress={() => router.replace('/(tabs)/appointments')}
        />

        <View style={styles.content}>
          <Card padding="lg" style={styles.confirmationHeroCard}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={46}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.confirmationTitle}>
              Demande de rendez-vous transmise !
            </Text>
            <Text style={styles.confirmationSubtitle}>
              Votre réservation a été enregistrée de manière sécurisée auprès du
              cabinet médical à Dakar.
            </Text>

            <View style={styles.referencePill}>
              <MaterialCommunityIcons
                name="identifier"
                size={15}
                color={Colors.primaryDark}
              />
              <Text style={styles.referencePillLabel}>Référence :</Text>
              <Text style={styles.referencePillCode}>
                {confirmedAppointment.referenceCode || confirmedAppointment.id}
              </Text>
            </View>

            <Badge
              label={getAppointmentStatusLabel(confirmedAppointment.status)}
              variant="pending"
              style={{ marginTop: Spacing.sm }}
            />
          </Card>

          {/* Detailed Receipt Card */}
          <Card padding="md" style={styles.receiptCard}>
            <Text style={styles.receiptSectionTitle}>
              Détails de votre consultation
            </Text>

            <View style={styles.doctorRow}>
              <Avatar
                name={confirmedAppointment.doctorName}
                uri={doctor.avatarUrl}
                size="md"
                verified
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>
                  {confirmedAppointment.doctorName}
                </Text>
                <Text style={styles.doctorSpecialty}>
                  {confirmedAppointment.doctorSpecialty}
                </Text>
                <Text style={styles.doctorClinic}>
                  Praticien vérifié • Ordre des Médecins du Sénégal
                </Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptRow}>
              <View style={styles.receiptIconWrap}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.receiptRowBody}>
                <Text style={styles.receiptLabel}>Date & Heure retenues</Text>
                <Text style={styles.receiptValue}>
                  {formatDateShortFr(confirmedAppointment.date)} à{' '}
                  {confirmedAppointment.time}
                </Text>
              </View>
            </View>

            <View style={styles.receiptRow}>
              <View style={styles.receiptIconWrap}>
                <MaterialCommunityIcons
                  name="hospital-building"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.receiptRowBody}>
                <Text style={styles.receiptLabel}>Établissement & Quartier</Text>
                <Text style={styles.receiptValue}>
                  {confirmedAppointment.clinicName} •{' '}
                  {confirmedAppointment.district}, Dakar
                </Text>
              </View>
            </View>

            <View style={styles.receiptRow}>
              <View style={styles.receiptIconWrap}>
                <MaterialCommunityIcons
                  name={
                    confirmedAppointment.consultationType === 'teleconsultation'
                      ? 'video-outline'
                      : 'stethoscope'
                  }
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.receiptRowBody}>
                <Text style={styles.receiptLabel}>Type de consultation</Text>
                <Text style={styles.receiptValue}>
                  {confirmedAppointment.consultationType === 'teleconsultation'
                    ? 'Téléconsultation vidéo'
                    : 'Consultation au cabinet médical'}
                </Text>
              </View>
            </View>

            <View style={styles.receiptRow}>
              <View style={styles.receiptIconWrap}>
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.receiptRowBody}>
                <Text style={styles.receiptLabel}>Honoraires médicaux</Text>
                <Text
                  style={[
                    styles.receiptValue,
                    { color: Colors.primary, fontWeight: '700' },
                  ]}
                >
                  {formatFCFA(confirmedAppointment.feeFCFA)} (Espèces / Wave /
                  Orange Money)
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.confirmationActions}>
            <PrimaryButton
              title="Voir le détail du rendez-vous"
              onPress={() =>
                router.replace(`/appointments/${confirmedAppointment.id}`)
              }
              size="lg"
              fullWidth
            />
            <SecondaryButton
              title="Accéder à tous mes rendez-vous"
              onPress={() => router.replace('/(tabs)/appointments')}
              size="md"
              fullWidth
            />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const supportsTeleconsultation =
    !doctor.consultationTypes ||
    doctor.consultationTypes.includes('teleconsultation');
  const supportsInPerson =
    !doctor.consultationTypes || doctor.consultationTypes.includes('in_person');

  const morningSlots = (selectedDateItem?.slots || []).filter(
    (s) => s.period === 'morning'
  );
  const afternoonSlots = (selectedDateItem?.slots || []).filter(
    (s) => s.period === 'afternoon'
  );

  return (
    <ScreenWrapper scrollable>
      <CustomHeader showBack title="Réserver une consultation" />

      <View style={styles.content}>
        {/* Doctor Summary Header Card */}
        <Card padding="md" style={styles.doctorCard}>
          <View style={styles.doctorRow}>
            <Avatar
              name={doctor.fullName}
              uri={doctor.avatarUrl}
              size="md"
              verified
            />
            <View style={styles.doctorInfo}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName}>{doctor.fullName}</Text>
                <Badge label="Vérifié" variant="verified" size="sm" />
              </View>
              <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              <Text style={styles.doctorClinic} numberOfLines={1}>
                {doctor.clinicName} • {doctor.district}, Dakar
              </Text>
            </View>
          </View>
        </Card>

        {bookingError && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={Colors.error}
            />
            <Text style={styles.errorBannerText}>{bookingError}</Text>
          </View>
        )}

        {/* Step 1: Mode de consultation */}
        <Text style={styles.stepTitle}>1. Mode de consultation</Text>
        <View style={styles.typeSelector}>
          <Pressable
            disabled={!supportsInPerson}
            onPress={() => setConsultationType('in_person')}
            style={[
              styles.typeCard,
              consultationType === 'in_person' && styles.typeCardActive,
              !supportsInPerson && styles.typeCardDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="hospital-building"
              size={22}
              color={
                consultationType === 'in_person'
                  ? Colors.primary
                  : Colors.secondaryText
              }
            />
            <Text
              style={[
                styles.typeLabel,
                consultationType === 'in_person' && styles.typeLabelActive,
              ]}
            >
              Au cabinet à Dakar
            </Text>
          </Pressable>

          <Pressable
            disabled={!supportsTeleconsultation}
            onPress={() => setConsultationType('teleconsultation')}
            style={[
              styles.typeCard,
              consultationType === 'teleconsultation' && styles.typeCardActive,
              !supportsTeleconsultation && styles.typeCardDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="video-outline"
              size={22}
              color={
                consultationType === 'teleconsultation'
                  ? Colors.primary
                  : Colors.secondaryText
              }
            />
            <View>
              <Text
                style={[
                  styles.typeLabel,
                  consultationType === 'teleconsultation' &&
                    styles.typeLabelActive,
                ]}
              >
                Téléconsultation
              </Text>
              {!supportsTeleconsultation && (
                <Text style={styles.unavailableMiniLabel}>Non proposé</Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* Step 2: Date Selection */}
        <Text style={styles.stepTitle}>2. Choisissez la date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
        >
          {bookableDates.map((item) => {
            const isSelected = selectedDateItem?.date === item.date;
            const hasSlots = !item.isBlocked && item.availableCount > 0;
            return (
              <Pressable
                key={item.date}
                onPress={() => handleSelectDate(item)}
                style={[
                  styles.dateCard,
                  isSelected && styles.dateCardActive,
                  !hasSlots && styles.dateCardMuted,
                ]}
              >
                <Text
                  style={[styles.dayText, isSelected && styles.dateTextActive]}
                >
                  {item.dayShort}
                </Text>
                <Text
                  style={[styles.dateNum, isSelected && styles.dateTextActive]}
                >
                  {item.dayNum}
                </Text>
                <Text
                  style={[
                    styles.monthText,
                    isSelected && styles.dateTextActive,
                  ]}
                >
                  {item.monthShort}
                </Text>
                <View
                  style={[
                    styles.slotCountBadge,
                    hasSlots
                      ? styles.slotCountBadgeOpen
                      : styles.slotCountBadgeClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotCountText,
                      !hasSlots && { color: Colors.secondaryText },
                    ]}
                  >
                    {hasSlots ? `${item.availableCount} disp.` : 'Complet'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Step 3: Available Time Slots */}
        <Text style={styles.stepTitle}>
          3. Choisissez un créneau horaire disponible
        </Text>

        {selectedDateItem?.isBlocked ? (
          <EmptyState
            title="Cabinet indisponible à cette date"
            description={
              selectedDateItem.blockedReason ||
              'Aucun créneau n’est ouvert sur cette journée. Veuillez sélectionner une autre date.'
            }
          />
        ) : (
          <>
            {morningSlots.length > 0 && (
              <>
                <Text style={styles.slotSectionLabel}>Matinée</Text>
                <View style={styles.slotsGrid}>
                  {morningSlots.map((slotItem) => {
                    const isSelected = selectedSlot === slotItem.time;
                    return (
                      <Pressable
                        key={slotItem.time}
                        disabled={!slotItem.isAvailable}
                        onPress={() => {
                          setBookingError(null);
                          setSelectedSlot(slotItem.time);
                        }}
                        style={[
                          styles.slotChip,
                          isSelected && styles.slotChipActive,
                          !slotItem.isAvailable && styles.slotChipDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            isSelected && styles.slotTextActive,
                            !slotItem.isAvailable && styles.slotTextDisabled,
                          ]}
                        >
                          {slotItem.time}
                        </Text>
                        {!slotItem.isAvailable && (
                          <Text style={styles.slotTakenLabel}>Réservé</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {afternoonSlots.length > 0 && (
              <>
                <Text style={styles.slotSectionLabel}>Après-midi</Text>
                <View style={styles.slotsGrid}>
                  {afternoonSlots.map((slotItem) => {
                    const isSelected = selectedSlot === slotItem.time;
                    return (
                      <Pressable
                        key={slotItem.time}
                        disabled={!slotItem.isAvailable}
                        onPress={() => {
                          setBookingError(null);
                          setSelectedSlot(slotItem.time);
                        }}
                        style={[
                          styles.slotChip,
                          isSelected && styles.slotChipActive,
                          !slotItem.isAvailable && styles.slotChipDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            isSelected && styles.slotTextActive,
                            !slotItem.isAvailable && styles.slotTextDisabled,
                          ]}
                        >
                          {slotItem.time}
                        </Text>
                        {!slotItem.isAvailable && (
                          <Text style={styles.slotTakenLabel}>Réservé</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {/* Step 4: Motif */}
        <Text style={styles.stepTitle}>
          4. Motif de consultation (facultatif)
        </Text>
        <CustomInput
          placeholder="Ex: Contrôle tensionnel, renouvellement ordonnance, suivi..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        {/* Step 5: Booking Summary Card */}
        <Card padding="md" style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif de réservation</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Praticien</Text>
            <Text style={styles.summaryValue}>{doctor.fullName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Établissement</Text>
            <Text style={styles.summaryValue}>
              {doctor.clinicName} ({doctor.district})
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mode de consultation</Text>
            <Text style={styles.summaryValue}>
              {consultationType === 'teleconsultation'
                ? 'Téléconsultation'
                : 'Au cabinet médical'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Créneau sélectionné</Text>
            <Text style={styles.summaryValue}>
              {selectedDateItem && selectedSlot
                ? `${formatDateShortFr(selectedDateItem.date)} à ${selectedSlot}`
                : 'Aucun créneau sélectionné'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Honoraire consultation</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {formatFCFA(doctor.consultationFeeFCFA)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Règlement</Text>
            <Text style={styles.summaryNotice}>
              Sur place au cabinet (Espèces / Wave / Orange Money)
            </Text>
          </View>
        </Card>

        {/* Confirm Preview Button */}
        <PrimaryButton
          title="Vérifier et Confirmer le rendez-vous"
          disabled={!selectedSlot || Boolean(selectedDateItem?.isBlocked)}
          onPress={handleOpenPreview}
          size="lg"
          fullWidth
          style={styles.bookButton}
        />
      </View>

      {/* Confirmation Dialog Modal */}
      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card padding="lg" style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={38}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.modalTitle}>
              Confirmer votre demande de rendez-vous
            </Text>

            <View style={styles.modalDetails}>
              <Text style={styles.modalDetailLine}>
                Praticien :{' '}
                <Text style={{ fontWeight: 'bold' }}>{doctor.fullName}</Text>
              </Text>
              <Text style={styles.modalDetailLine}>
                Spécialité :{' '}
                <Text style={{ fontWeight: 'bold' }}>{doctor.specialty}</Text>
              </Text>
              <Text style={styles.modalDetailLine}>
                Date & Heure :{' '}
                <Text style={{ fontWeight: 'bold' }}>
                  {selectedDateItem
                    ? formatDateShortFr(selectedDateItem.date)
                    : ''}{' '}
                  à {selectedSlot}
                </Text>
              </Text>
              <Text style={styles.modalDetailLine}>
                Établissement :{' '}
                <Text style={{ fontWeight: 'bold' }}>
                  {doctor.clinicName} ({doctor.district}, Dakar)
                </Text>
              </Text>
              <Text style={styles.modalDetailLine}>
                Mode :{' '}
                <Text style={{ fontWeight: 'bold' }}>
                  {consultationType === 'teleconsultation'
                    ? 'Téléconsultation'
                    : 'Au cabinet'}
                </Text>
              </Text>
              <Text style={styles.modalDetailLine}>
                Honoraire :{' '}
                <Text style={{ fontWeight: 'bold', color: Colors.primary }}>
                  {formatFCFA(doctor.consultationFeeFCFA)}
                </Text>
              </Text>
            </View>

            <View style={styles.phaseNotice}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.phaseNoticeText}>
                Ce créneau sera immédiatement réservé pour vous avec le statut «
                En attente de validation » par {doctor.fullName}.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                title="Confirmer définitivement"
                loading={isSubmitting}
                onPress={handleConfirmBooking}
                size="md"
                fullWidth
              />
              <SecondaryButton
                title="Modifier le créneau"
                disabled={isSubmitting}
                onPress={() => setIsConfirmModalVisible(false)}
                variant="ghost"
                size="sm"
                fullWidth
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  doctorCard: {
    marginBottom: Spacing.md,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  doctorName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  doctorSpecialty: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 2,
  },
  doctorClinic: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  errorBannerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 52,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  typeCardDisabled: {
    opacity: 0.45,
    backgroundColor: Colors.surfaceMuted,
  },
  typeLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  typeLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  unavailableMiniLabel: {
    fontSize: 9,
    color: Colors.error,
  },
  dateList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  dateCard: {
    width: 76,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dateCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  dateCardMuted: {
    opacity: 0.6,
  },
  dayText: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  dateNum: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginVertical: 2,
  },
  monthText: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  dateTextActive: {
    color: Colors.primary,
  },
  slotCountBadge: {
    marginTop: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.pill,
  },
  slotCountBadgeOpen: {
    backgroundColor: 'rgba(20, 125, 117, 0.12)',
  },
  slotCountBadgeClosed: {
    backgroundColor: Colors.surfaceMuted,
  },
  slotCountText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  slotSectionLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.semiBold,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  slotChip: {
    width: '30%',
    minWidth: 88,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  slotChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  slotChipDisabled: {
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.borderLight,
    opacity: 0.65,
  },
  slotText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
  },
  slotTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  slotTextDisabled: {
    color: Colors.secondaryText,
    textDecorationLine: 'line-through',
  },
  slotTakenLabel: {
    fontSize: 9,
    color: Colors.error,
    marginTop: 1,
  },
  summaryCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
    gap: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  summaryNotice: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  bookButton: {
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalDetails: {
    width: '100%',
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 6,
    marginBottom: Spacing.md,
  },
  modalDetailLine: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.text,
  },
  phaseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  phaseNoticeText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.primaryDark,
    flex: 1,
    lineHeight: 16,
  },
  modalActions: {
    width: '100%',
    gap: Spacing.xs,
  },
  confirmationHeroCard: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadows.md,
  },
  successIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  confirmationTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  confirmationSubtitle: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  referencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  referencePillLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
  },
  referencePillCode: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    letterSpacing: 0.6,
  },
  receiptCard: {
    marginBottom: Spacing.lg,
  },
  receiptSectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm + 2,
  },
  receiptIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptRowBody: {
    flex: 1,
  },
  receiptLabel: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
  },
  receiptValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
    marginTop: 1,
  },
  confirmationActions: {
    gap: Spacing.sm,
  },
});
