import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { CustomInput } from '@/components/common/CustomInput';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { formatDateShortFr, formatFCFA } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import {
  Appointment,
  getAppointmentStatusLabel,
} from '@/types/appointment';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState(
    'Empêchement personnel du patient'
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      const actorId = user?.id || 'pat_pre_1';
      const item = await appointmentService.getAppointmentById(
        id,
        actorId,
        user?.role
      );
      if (mounted) {
        setAppointment(item);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id, user?.id, user?.role]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Détail du Rendez-vous" />
        <LoadingIndicator fullScreen message="Chargement du rendez-vous..." />
      </ScreenWrapper>
    );
  }

  if (!appointment) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Détail du Rendez-vous" />
        <ErrorState
          title="Rendez-vous introuvable"
          message="Cette réservation est introuvable ou vous n'y avez pas accès."
          onRetry={() => router.back()}
        />
      </ScreenWrapper>
    );
  }

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    const actorId = user?.id || appointment.patientId;
    const { appointment: updated, error } =
      await appointmentService.cancelAppointment(
        appointment.id,
        'patient',
        cancelReason.trim() || 'Annulé par le patient',
        actorId
      );
    setIsCancelling(false);
    setCancelModalVisible(false);

    if (error) {
      Alert.alert('Erreur', error);
    } else if (updated) {
      setAppointment(updated);
      Alert.alert(
        'Rendez-vous annulé',
        'Votre consultation a bien été annulée et le créneau horaire a été libéré.'
      );
    }
  };

  const isActive =
    appointment.status === 'confirmed' || appointment.status === 'pending';

  const consultationModeLabel =
    (appointment.consultationType || appointment.type) === 'teleconsultation'
      ? 'Téléconsultation vidéo'
      : 'Consultation au cabinet à Dakar';

  return (
    <ScreenWrapper scrollable>
      <CustomHeader showBack title="Détail du Rendez-vous" />

      <View style={styles.content}>
        {/* Status & Reference Card */}
        <Card padding="md" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={styles.statusLabel}>Statut de la réservation</Text>
              <Text style={styles.referenceText}>
                Référence : {appointment.referenceCode || appointment.id}
              </Text>
            </View>
            <Badge
              label={getAppointmentStatusLabel(appointment.status)}
              variant={
                appointment.status === 'confirmed' ||
                appointment.status === 'completed'
                  ? 'verified'
                  : appointment.status === 'pending'
                    ? 'pending'
                    : 'rejected'
              }
            />
          </View>

          <View style={styles.statusExplanationBox}>
            <MaterialCommunityIcons
              name={
                appointment.status === 'confirmed'
                  ? 'check-circle-outline'
                  : appointment.status === 'pending'
                    ? 'clock-alert-outline'
                    : appointment.status === 'completed'
                      ? 'clipboard-check-outline'
                      : 'close-octagon-outline'
              }
              size={16}
              color={Colors.primaryDark}
            />
            <Text style={styles.statusExplanationText}>
              {appointment.status === 'pending'
                ? 'Votre demande a été transmise au cabinet médical. Vous serez notifié dès confirmation par le praticien.'
                : appointment.status === 'confirmed'
                  ? 'Votre rendez-vous est confirmé par le praticien. Veuillez vous présenter 10 minutes avant l’horaire prévu.'
                  : appointment.status === 'completed'
                    ? 'Cette consultation médicale a été effectuée et clôturée par le praticien.'
                    : appointment.status === 'rejected'
                      ? `Cette demande n’a pas pu être retenue par le cabinet (${appointment.rejectionReason || 'Créneau indisponible'}).`
                      : `Ce rendez-vous a été annulé (${appointment.cancellationReason || 'Annulé'}).`}
            </Text>
          </View>
        </Card>

        {/* Doctor Info with Direct Link to Profile */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.cardTitle}>Médecin traitant</Text>
          <View style={styles.doctorRow}>
            <Avatar name={appointment.doctorName} size="md" verified />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{appointment.doctorName}</Text>
              <Text style={styles.doctorSpecialty}>
                {appointment.doctorSpecialty}
              </Text>
              <Badge
                label="Praticien Vérifié"
                variant="verified"
                size="sm"
                style={{ marginTop: 4 }}
              />
            </View>
          </View>

          <Pressable
            onPress={() => router.push(`/doctor/${appointment.doctorId}`)}
            style={styles.viewDoctorProfileBtn}
          >
            <MaterialCommunityIcons
              name="account-eye-outline"
              size={17}
              color={Colors.primary}
            />
            <Text style={styles.viewDoctorProfileText}>
              Consulter le profil complet du médecin
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={Colors.primary}
            />
          </Pressable>
        </Card>

        {/* Date, Time, Consultation Type & Location */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.cardTitle}>Créneau & Lieu de consultation</Text>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.detailText}>
              {formatDateShortFr(appointment.date)} à {appointment.time}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name={
                (appointment.consultationType || appointment.type) ===
                'teleconsultation'
                  ? 'video-outline'
                  : 'stethoscope'
              }
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.detailText}>{consultationModeLabel}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="hospital-building"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.detailText}>{appointment.clinicName}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.detailText}>
              {appointment.district || appointment.clinicAddress || 'Plateau'},
              Dakar, Sénégal
            </Text>
          </View>
        </Card>

        {/* Motif de consultation & Notes */}
        {(appointment.reason ||
          appointment.notes ||
          appointment.rejectionReason ||
          appointment.cancellationReason) && (
          <Card padding="md" style={styles.card}>
            <Text style={styles.cardTitle}>Motif & Suivi de la visite</Text>
            {appointment.reason && (
              <Text style={styles.reasonText}>{appointment.reason}</Text>
            )}
            {appointment.notes && (
              <View style={styles.clinicalNotesBox}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={16}
                  color={Colors.primaryDark}
                />
                <Text style={styles.clinicalNotesText}>
                  Note du praticien : {appointment.notes}
                </Text>
              </View>
            )}
            {(appointment.rejectionReason || appointment.cancellationReason) && (
              <View style={styles.notesBox}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={Colors.error}
                />
                <Text style={styles.notesText}>
                  Motif :{' '}
                  {appointment.rejectionReason || appointment.cancellationReason}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Fees & Payment */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.cardTitle}>Honoraires & Mode de Paiement</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Tarif consultation</Text>
            <Text style={styles.paymentValue}>
              {formatFCFA(appointment.feeFCFA)}
            </Text>
          </View>
          <Text style={styles.paymentMethod}>
            Paiement accepté sur place : Espèces, Wave, Orange Money.
          </Text>
        </Card>

        {/* Actions */}
        {isActive ? (
          <View style={styles.actions}>
            <PrimaryButton
              title="Prendre un autre créneau avec ce médecin"
              onPress={() => router.push(`/booking/${appointment.doctorId}`)}
              size="md"
              fullWidth
            />
            <SecondaryButton
              title="Annuler ce rendez-vous"
              loading={isCancelling}
              onPress={() => setCancelModalVisible(true)}
              variant="outline"
              size="md"
              fullWidth
              style={{ borderColor: Colors.error }}
              textStyle={{ color: Colors.error }}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <PrimaryButton
              title="Reprendre rendez-vous avec ce praticien"
              onPress={() => router.push(`/booking/${appointment.doctorId}`)}
              size="md"
              fullWidth
            />
          </View>
        )}
      </View>

      {/* Cancel Confirmation Dialog Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card padding="lg" style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmer l’annulation</Text>
            <Text style={styles.modalSubtitle}>
              Votre rendez-vous avec {appointment.doctorName} du{' '}
              {formatDateShortFr(appointment.date)} à {appointment.time} sera
              annulé et le créneau horaire sera libéré.
            </Text>

            <CustomInput
              label="Motif d’annulation (facultatif)"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalBtnRow}>
              <SecondaryButton
                title="Conserver"
                size="sm"
                onPress={() => setCancelModalVisible(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Confirmer l’annulation"
                size="sm"
                loading={isCancelling}
                onPress={handleConfirmCancel}
                style={{ flex: 1.3, backgroundColor: Colors.error }}
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
  statusCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.secondaryLight,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  referenceText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
    fontWeight: Typography.fontWeight.semiBold,
  },
  statusExplanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 125, 117, 0.15)',
  },
  statusExplanationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryDark,
    flex: 1,
    lineHeight: 17,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  doctorSpecialty: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  viewDoctorProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: 6,
  },
  viewDoctorProfileText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs + 2,
  },
  detailText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    flex: 1,
  },
  reasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: Typography.lineHeight.sm + 2,
  },
  clinicalNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  clinicalNotesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryDark,
    flex: 1,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  notesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  paymentValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  paymentMethod: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: Spacing.xs,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
  },
  modalTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 4,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
