import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from '@/constants/theme';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { CustomInput } from '@/components/common/CustomInput';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useAuth } from '@/context/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import { availabilityService } from '@/services/availabilityService';
import { TODAY_ISO } from '@/services/mockData';
import { Appointment } from '@/types/appointment';
import { DoctorAvailabilityConfig } from '@/types/doctor';
import { formatDateShortFr } from '@/utils/formatters';

const DURATIONS = [15, 20, 30, 45, 60];

export default function DoctorAvailabilityScreen() {
  const { user } = useAuth();
  const doctorId = user?.id || 'doc_pre_1';

  const [config, setConfig] = useState<DoctorAvailabilityConfig | null>(null);
  const [confirmedAppointments, setConfirmedAppointments] = useState<
    Appointment[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [protectionWarning, setProtectionWarning] = useState<string | null>(
    null
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Add weekly slot form state
  const [addingSlotForDay, setAddingSlotForDay] = useState<number | null>(null);
  const [weeklyStartTime, setWeeklyStartTime] = useState('08:30');
  const [weeklyEndTime, setWeeklyEndTime] = useState('12:30');

  // Add custom dated future slot form state
  const [showAddCustomSlot, setShowAddCustomSlot] = useState(false);
  const [customSlotDate, setCustomSlotDate] = useState('2026-11-21');
  const [customSlotStart, setCustomSlotStart] = useState('09:00');
  const [customSlotEnd, setCustomSlotEnd] = useState('12:00');

  // Add blocked unavailable period form state
  const [showAddBlockedPeriod, setShowAddBlockedPeriod] = useState(false);
  const [blockStartDate, setBlockStartDate] = useState('2026-11-26');
  const [blockEndDate, setBlockEndDate] = useState('2026-11-28');
  const [blockReason, setBlockReason] = useState(
    'Congrès médical cardiologique à Dakar'
  );

  const loadAvailabilityAndAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const [availConfig, allApts] = await Promise.all([
        availabilityService.getDoctorAvailability(doctorId),
        appointmentService.getDoctorAppointments(doctorId),
      ]);
      setConfig(availConfig);
      setConfirmedAppointments(
        allApts.filter(
          (a) => a.status === 'confirmed' && a.date >= TODAY_ISO
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  useFocusEffect(
    useCallback(() => {
      loadAvailabilityAndAppointments();
    }, [loadAvailabilityAndAppointments])
  );

  const clearBanners = () => {
    setProtectionWarning(null);
    setFeedbackMessage(null);
  };

  const handleSelectDuration = async (mins: number) => {
    clearBanners();
    const { config: updated, error } =
      await availabilityService.updateConsultationDuration(doctorId, mins);
    if (error) {
      setProtectionWarning(error);
    } else if (updated) {
      setConfig(updated);
      setFeedbackMessage(
        `Durée de consultation fixée à ${mins} minutes par patient.`
      );
    }
  };

  const handleToggleDay = async (dayIndex: number) => {
    clearBanners();
    const { config: updated, error } =
      await availabilityService.toggleWorkingDay(
        doctorId,
        dayIndex,
        confirmedAppointments
      );

    if (error) {
      setProtectionWarning(error);
      Alert.alert('Rendez-vous confirmé protégé', error);
      return;
    }

    if (updated) {
      setConfig(updated);
      setFeedbackMessage('Jours ouvrés mis à jour.');
    }
  };

  const handleAddWeeklySlot = async (dayIndex: number) => {
    clearBanners();
    const { config: updated, error } =
      await availabilityService.addWeeklyTimeSlot(
        doctorId,
        dayIndex,
        weeklyStartTime,
        weeklyEndTime
      );

    if (error) {
      setProtectionWarning(error);
      return;
    }

    if (updated) {
      setConfig(updated);
      setAddingSlotForDay(null);
      setFeedbackMessage(
        `Créneau ${weeklyStartTime} - ${weeklyEndTime} ajouté avec succès.`
      );
    }
  };

  const handleRemoveWeeklySlot = async (
    dayIndex: number,
    slotIndex: number
  ) => {
    clearBanners();
    const { config: updated, error } =
      await availabilityService.removeWeeklyTimeSlot(
        doctorId,
        dayIndex,
        slotIndex,
        confirmedAppointments
      );

    if (error) {
      setProtectionWarning(error);
      Alert.alert('Suppression refusée (RDV confirmé)', error);
      return;
    }

    if (updated) {
      setConfig(updated);
      setFeedbackMessage('Plage horaire retirée du planning.');
    }
  };

  const handleAddCustomSlot = async () => {
    clearBanners();
    const { config: updated, error } =
      await availabilityService.addCustomAvailableSlot(
        doctorId,
        customSlotDate,
        customSlotStart,
        customSlotEnd
      );

    if (error) {
      setProtectionWarning(error);
      return;
    }

    if (updated) {
      setConfig(updated);
      setShowAddCustomSlot(false);
      setFeedbackMessage(
        `Créneau disponible créé pour le ${formatDateShortFr(customSlotDate)} (${customSlotStart} - ${customSlotEnd}).`
      );
    }
  };

  const handleRemoveCustomSlot = async (slotId: string) => {
    clearBanners();
    const { config: updated, error } =
      await availabilityService.removeCustomAvailableSlot(
        doctorId,
        slotId,
        confirmedAppointments
      );

    if (error) {
      setProtectionWarning(error);
      Alert.alert('Rendez-vous confirmé protégé', error);
      return;
    }

    if (updated) {
      setConfig(updated);
      setFeedbackMessage('Créneau futur disponible supprimé.');
    }
  };

  const handleAddBlockedPeriod = async () => {
    clearBanners();
    const { config: updated, error } =
      await availabilityService.addBlockedPeriod(
        doctorId,
        blockStartDate,
        blockEndDate,
        blockReason,
        confirmedAppointments
      );

    if (error) {
      setProtectionWarning(error);
      Alert.alert('Conflit avec un rendez-vous confirmé', error);
      return;
    }

    if (updated) {
      setConfig(updated);
      setShowAddBlockedPeriod(false);
      setFeedbackMessage(
        `Période d’indisponibilité enregistrée (${formatDateShortFr(blockStartDate)} au ${formatDateShortFr(blockEndDate)}).`
      );
    }
  };

  const handleRemoveBlockedPeriod = async (blockId: string) => {
    clearBanners();
    const { config: updated } =
      await availabilityService.removeBlockedPeriod(doctorId, blockId);
    if (updated) {
      setConfig(updated);
      setFeedbackMessage('Période d’indisponibilité levée.');
    }
  };

  if (isLoading || !config) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Disponibilités & Horaires" />
        <LoadingIndicator
          fullScreen
          message="Chargement de vos disponibilités..."
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable>
      <CustomHeader showBack title="Disponibilités & Horaires" />

      <View style={styles.content}>
        {/* Confirmed Appointments Protection Banner */}
        <Card padding="md" style={styles.protectionBannerCard}>
          <View style={styles.protectionRow}>
            <MaterialCommunityIcons
              name="shield-check"
              size={24}
              color={Colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.protectionTitle}>
                Protection active des rendez-vous confirmés
              </Text>
              <Text style={styles.protectionDesc}>
                Vous avez actuellement{' '}
                <Text style={{ fontWeight: 'bold' }}>
                  {confirmedAppointments.length} rendez-vous confirmé(s)
                </Text>{' '}
                à venir. Le système empêche automatiquement la suppression d’un créneau ou le blocage d’une date qui entrerait en conflit avec une consultation déjà confirmée.
              </Text>
            </View>
          </View>
        </Card>

        {protectionWarning && (
          <View style={styles.warningAlert}>
            <MaterialCommunityIcons
              name="alert-octagon"
              size={20}
              color={Colors.error}
            />
            <Text style={styles.warningAlertText}>{protectionWarning}</Text>
          </View>
        )}

        {feedbackMessage && (
          <View style={styles.successAlert}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={Colors.success}
            />
            <Text style={styles.successAlertText}>{feedbackMessage}</Text>
          </View>
        )}

        {/* 1. Consultation Duration Selector */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>1. Durée d’une consultation</Text>
          <Text style={styles.sectionSubtitle}>
            Définissez la durée standard accordée à chaque consultation au cabinet
          </Text>

          <View style={styles.durationRow}>
            {DURATIONS.map((mins) => {
              const isSelected = config.consultationDurationMinutes === mins;
              return (
                <Pressable
                  key={mins}
                  onPress={() => handleSelectDuration(mins)}
                  style={[
                    styles.durationChip,
                    isSelected && styles.durationChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      isSelected && styles.durationTextActive,
                    ]}
                  >
                    {mins} min
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 2. Future Custom Available Slots (Create & Remove) */}
        <View style={styles.headerRowBetween}>
          <Text style={styles.sectionHeaderTitle}>
            2. Créneaux disponibles spécifiques
          </Text>
          <Pressable
            onPress={() => setShowAddCustomSlot(!showAddCustomSlot)}
            style={styles.smallAddBtn}
          >
            <MaterialCommunityIcons
              name={showAddCustomSlot ? 'close' : 'plus'}
              size={16}
              color={Colors.white}
            />
            <Text style={styles.smallAddBtnText}>
              {showAddCustomSlot ? 'Fermer' : 'Créer un créneau'}
            </Text>
          </Pressable>
        </View>

        {showAddCustomSlot && (
          <Card padding="md" style={styles.formInlineCard}>
            <Text style={styles.inlineFormTitle}>
              Ajouter un créneau disponible futur
            </Text>
            <CustomInput
              label="Date du créneau (AAAA-MM-JJ)"
              value={customSlotDate}
              onChangeText={setCustomSlotDate}
              placeholder="2026-11-21"
              leftIcon="calendar"
            />
            <View style={styles.timeInputsRow}>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Heure début"
                  value={customSlotStart}
                  onChangeText={setCustomSlotStart}
                  placeholder="09:00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Heure fin"
                  value={customSlotEnd}
                  onChangeText={setCustomSlotEnd}
                  placeholder="12:00"
                />
              </View>
            </View>
            <PrimaryButton
              title="Enregistrer ce créneau disponible"
              size="sm"
              onPress={handleAddCustomSlot}
              fullWidth
            />
          </Card>
        )}

        <Card padding="md" style={styles.card}>
          {config.customAvailableSlots.length > 0 ? (
            config.customAvailableSlots.map((cSlot) => (
              <View key={cSlot.id} style={styles.customSlotItem}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={20}
                  color={Colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.customSlotDate}>
                    {formatDateShortFr(cSlot.date)} ({cSlot.date})
                  </Text>
                  <Text style={styles.customSlotHours}>
                    Plage disponible : {cSlot.startTime} — {cSlot.endTime}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleRemoveCustomSlot(cSlot.id)}
                  style={styles.deleteIconBtn}
                  accessibilityLabel="Supprimer ce créneau futur"
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={Colors.error}
                  />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.emptySmallText}>
              Aucun créneau ponctuel supplémentaire. Utilisez « Créer un créneau » pour ouvrir des horaires exceptionnels.
            </Text>
          )}
        </Card>

        {/* 3. Blocked Unavailable Periods */}
        <View style={styles.headerRowBetween}>
          <Text style={styles.sectionHeaderTitle}>
            3. Périodes d’indisponibilité & Congés
          </Text>
          <Pressable
            onPress={() => setShowAddBlockedPeriod(!showAddBlockedPeriod)}
            style={[styles.smallAddBtn, { backgroundColor: Colors.accentGold }]}
          >
            <MaterialCommunityIcons
              name={showAddBlockedPeriod ? 'close' : 'calendar-remove'}
              size={16}
              color={Colors.white}
            />
            <Text style={styles.smallAddBtnText}>
              {showAddBlockedPeriod ? 'Fermer' : 'Bloquer une période'}
            </Text>
          </Pressable>
        </View>

        {showAddBlockedPeriod && (
          <Card padding="md" style={styles.formInlineCard}>
            <Text style={styles.inlineFormTitle}>
              Bloquer une période d’indisponibilité
            </Text>
            <View style={styles.timeInputsRow}>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Date début (AAAA-MM-JJ)"
                  value={blockStartDate}
                  onChangeText={setBlockStartDate}
                  placeholder="2026-11-26"
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Date fin (AAAA-MM-JJ)"
                  value={blockEndDate}
                  onChangeText={setBlockEndDate}
                  placeholder="2026-11-28"
                />
              </View>
            </View>
            <CustomInput
              label="Motif d’indisponibilité"
              value={blockReason}
              onChangeText={setBlockReason}
              placeholder="Ex: Congés annuels, Séminaire médical..."
            />
            <PrimaryButton
              title="Bloquer cette période"
              size="sm"
              onPress={handleAddBlockedPeriod}
              fullWidth
            />
          </Card>
        )}

        <Card padding="md" style={styles.card}>
          {config.blockedPeriods.length > 0 ? (
            config.blockedPeriods.map((blk) => (
              <View key={blk.id} style={styles.customSlotItem}>
                <MaterialCommunityIcons
                  name="calendar-lock"
                  size={20}
                  color={Colors.warning}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.customSlotDate}>
                    Du {formatDateShortFr(blk.startDate)} au{' '}
                    {formatDateShortFr(blk.endDate)}
                  </Text>
                  <Text style={styles.customSlotHours}>{blk.reason}</Text>
                </View>
                <Pressable
                  onPress={() => handleRemoveBlockedPeriod(blk.id)}
                  style={styles.deleteIconBtn}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={Colors.error}
                  />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.emptySmallText}>
              Aucune période bloquée actuellement.
            </Text>
          )}
        </Card>

        {/* 4. Weekly Working Days & Time Slots */}
        <Text style={styles.sectionHeaderTitle}>
          4. Jours ouvrés & Plages horaires hebdomadaires
        </Text>

        {config.weeklySchedule.map((day) => (
          <Card key={day.dayName} padding="md" style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View style={styles.dayTitleRow}>
                <Text style={styles.dayName}>{day.dayName}</Text>
                <Badge
                  label={day.isEnabled ? 'Ouvert' : 'Fermé'}
                  variant={day.isEnabled ? 'verified' : 'neutral'}
                  size="sm"
                />
              </View>

              <Switch
                value={day.isEnabled}
                onValueChange={() => handleToggleDay(day.dayIndex)}
                trackColor={{ false: Colors.border, true: Colors.secondary }}
                thumbColor={day.isEnabled ? Colors.primary : '#f4f3f4'}
              />
            </View>

            {day.isEnabled && (
              <View style={styles.slotsList}>
                {day.slots.map((slotLabel, idx) => (
                  <View key={`${day.dayIndex}-${idx}`} style={styles.slotRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.slotRange}>{slotLabel}</Text>
                    <Pressable
                      onPress={() => handleRemoveWeeklySlot(day.dayIndex, idx)}
                      hitSlop={8}
                      style={styles.removeSlotBtn}
                    >
                      <MaterialCommunityIcons
                        name="close-circle-outline"
                        size={18}
                        color={Colors.error}
                      />
                    </Pressable>
                  </View>
                ))}

                {addingSlotForDay === day.dayIndex ? (
                  <View style={styles.addWeeklyBox}>
                    <View style={styles.timeInputsRow}>
                      <View style={{ flex: 1 }}>
                        <CustomInput
                          label="Début (HH:MM)"
                          value={weeklyStartTime}
                          onChangeText={setWeeklyStartTime}
                          placeholder="08:30"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <CustomInput
                          label="Fin (HH:MM)"
                          value={weeklyEndTime}
                          onChangeText={setWeeklyEndTime}
                          placeholder="12:30"
                        />
                      </View>
                    </View>
                    <View style={styles.addWeeklyBtnRow}>
                      <SecondaryButton
                        title="Annuler"
                        size="sm"
                        onPress={() => setAddingSlotForDay(null)}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        title="Ajouter"
                        size="sm"
                        onPress={() => handleAddWeeklySlot(day.dayIndex)}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setAddingSlotForDay(day.dayIndex);
                      setWeeklyStartTime('08:30');
                      setWeeklyEndTime('12:30');
                    }}
                    style={styles.addSlotTrigger}
                  >
                    <MaterialCommunityIcons
                      name="plus-circle-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.addSlotTriggerText}>
                      Ajouter une plage horaire le {day.dayName}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </Card>
        ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  protectionBannerCard: {
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.25)',
    marginBottom: Spacing.md,
  },
  protectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  protectionTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  protectionDesc: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.text,
    marginTop: 2,
    lineHeight: 16,
  },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  warningAlertText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    fontWeight: Typography.fontWeight.semiBold,
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  successAlertText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.success,
    fontWeight: Typography.fontWeight.semiBold,
    flex: 1,
  },
  card: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  durationChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  durationChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  durationTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  headerRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    flex: 1,
  },
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  smallAddBtnText: {
    fontSize: Typography.fontSize.xs - 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  formInlineCard: {
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  inlineFormTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.sm,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  customSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  customSlotDate: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  customSlotHours: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  deleteIconBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.errorLight,
  },
  emptySmallText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontStyle: 'italic',
  },
  dayCard: {
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayName: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  slotsList: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  slotRange: {
    flex: 1,
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
  },
  removeSlotBtn: {
    padding: 2,
  },
  addWeeklyBox: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addWeeklyBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addSlotTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  addSlotTriggerText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});
