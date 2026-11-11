import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { Avatar } from '@/components/common/Avatar';
import { CustomInput } from '@/components/common/CustomInput';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import {
  Appointment,
  getAppointmentStatusLabel,
} from '@/types/appointment';
import { formatDateShortFr, formatFCFA } from '@/utils/formatters';

type DoctorAptFilter = 'requests' | 'confirmed' | 'past' | 'cancelled';

export default function DoctorAppointmentsScreen() {
  const { user } = useAuth();
  const doctorId = user?.id || 'doc_pre_1';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeFilter, setActiveFilter] = useState<DoctorAptFilter>('requests');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Action Modal State (Reject, Cancel, or Mark Completed)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAptForAction, setSelectedAptForAction] =
    useState<Appointment | null>(null);
  const [actionType, setActionType] = useState<
    'reject' | 'cancel' | 'complete'
  >('reject');
  const [actionText, setActionText] = useState('');

  const loadAppointments = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const list = await appointmentService.getDoctorAppointments(doctorId);
        setAppointments(list);
      } catch (e: any) {
        setError(e.message || 'Impossible de charger les rendez-vous.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [doctorId]
  );

  useFocusEffect(
    useCallback(() => {
      loadAppointments(false);
    }, [loadAppointments])
  );

  const pendingList = appointments.filter((a) => a.status === 'pending');
  const confirmedList = appointments.filter((a) => a.status === 'confirmed');
  const pastList = appointments.filter((a) => a.status === 'completed');
  const cancelledList = appointments.filter(
    (a) => a.status === 'cancelled' || a.status === 'rejected'
  );

  const filtered =
    activeFilter === 'requests'
      ? pendingList
      : activeFilter === 'confirmed'
        ? confirmedList
        : activeFilter === 'past'
          ? pastList
          : cancelledList;

  const handleConfirmRequest = async (apt: Appointment) => {
    setProcessingId(apt.id);
    const { error: confirmError } = await appointmentService.confirmAppointment(
      apt.id,
      doctorId,
      'doctor'
    );
    setProcessingId(null);

    if (confirmError) {
      Alert.alert('Conflit ou erreur', confirmError);
      return;
    }

    await loadAppointments(true);
    Alert.alert(
      'Rendez-vous confirmé',
      `La demande de ${apt.patientName || 'votre patient'} (${formatDateShortFr(apt.date)} à ${apt.time}) est désormais confirmée.`
    );
  };

  const openActionModal = (
    apt: Appointment,
    type: 'reject' | 'cancel' | 'complete'
  ) => {
    setSelectedAptForAction(apt);
    setActionType(type);
    if (type === 'reject') {
      setActionText('Créneau indisponible au planning du praticien');
    } else if (type === 'cancel') {
      setActionText('Empêchement médical / Urgence hospitalière');
    } else {
      setActionText(
        apt.notes || 'Consultation effectuée au cabinet. Suivi normal.'
      );
    }
    setActionModalVisible(true);
  };

  const handleSubmitActionModal = async () => {
    if (!selectedAptForAction) return;
    setProcessingId(selectedAptForAction.id);

    if (actionType === 'reject') {
      const { error: rejectError } = await appointmentService.rejectAppointment(
        selectedAptForAction.id,
        actionText,
        doctorId,
        'doctor'
      );
      setProcessingId(null);
      setActionModalVisible(false);

      if (rejectError) {
        Alert.alert('Erreur', rejectError);
        return;
      }
      await loadAppointments(true);
    } else if (actionType === 'cancel') {
      const { error: cancelError } = await appointmentService.cancelAppointment(
        selectedAptForAction.id,
        'doctor',
        actionText,
        doctorId
      );
      setProcessingId(null);
      setActionModalVisible(false);

      if (cancelError) {
        Alert.alert('Erreur', cancelError);
        return;
      }
      await loadAppointments(true);
    } else {
      const { error: completeError } =
        await appointmentService.completeAppointment(
          selectedAptForAction.id,
          doctorId,
          actionText,
          'doctor'
        );
      setProcessingId(null);
      setActionModalVisible(false);

      if (completeError) {
        Alert.alert('Erreur', completeError);
        return;
      }
      await loadAppointments(true);
      Alert.alert(
        'Consultation terminée',
        `Le rendez-vous avec ${selectedAptForAction.patientName || 'le patient'} a été marqué comme terminé.`
      );
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Gestion des Rendez-vous" />
        <LoadingIndicator
          fullScreen
          message="Chargement du planning des patients..."
        />
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Gestion des Rendez-vous" />
        <ErrorState
          title="Erreur de chargement"
          message={error}
          onRetry={() => loadAppointments(false)}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <CustomHeader showBack title="Gestion des Rendez-vous" />

      {/* 4 Filter Tabs: Requests, Confirmed, Past, Cancelled */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          <Pressable
            onPress={() => setActiveFilter('requests')}
            style={[
              styles.filterChip,
              activeFilter === 'requests' && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === 'requests' && styles.filterTextActive,
              ]}
            >
              Demandes ({pendingList.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('confirmed')}
            style={[
              styles.filterChip,
              activeFilter === 'confirmed' && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === 'confirmed' && styles.filterTextActive,
              ]}
            >
              À venir / Confirmés ({confirmedList.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('past')}
            style={[
              styles.filterChip,
              activeFilter === 'past' && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === 'past' && styles.filterTextActive,
              ]}
            >
              Terminés ({pastList.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('cancelled')}
            style={[
              styles.filterChip,
              activeFilter === 'cancelled' && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === 'cancelled' && styles.filterTextActive,
              ]}
            >
              Annulés / Refusés ({cancelledList.length})
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
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
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <Card key={item.id} padding="md" style={styles.appointmentCard}>
              <View style={styles.cardHeader}>
                <Avatar name={item.patientName || 'Patient'} size="md" />

                <View style={styles.patientInfo}>
                  <Text style={styles.refCodeText}>
                    Réf: {item.referenceCode || item.id}
                  </Text>
                  <Text style={styles.patientName}>
                    {item.patientName || 'Patient SunuCare'}
                  </Text>
                  <Text style={styles.patientPhone}>
                    {item.patientPhone || '+221 77 000 00 00'}
                  </Text>
                </View>

                <Badge
                  label={getAppointmentStatusLabel(item.status)}
                  variant={
                    item.status === 'confirmed' || item.status === 'completed'
                      ? 'verified'
                      : item.status === 'pending'
                        ? 'pending'
                        : 'rejected'
                  }
                  size="sm"
                />
              </View>

              <View style={styles.cardMeta}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Date & Heure</Text>
                  <Text style={styles.metaValue}>
                    {formatDateShortFr(item.date)} à {item.time}
                  </Text>
                </View>

                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Mode</Text>
                  <Text style={styles.metaValue}>
                    {(item.consultationType || item.type) === 'teleconsultation'
                      ? 'Téléconsultation'
                      : 'Au cabinet'}
                  </Text>
                </View>

                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Honoraire</Text>
                  <Text style={[styles.metaValue, { color: Colors.primary }]}>
                    {formatFCFA(item.feeFCFA)}
                  </Text>
                </View>
              </View>

              {item.reason && (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Motif :</Text>
                  <Text style={styles.reasonText}>{item.reason}</Text>
                </View>
              )}

              {item.notes && (
                <View style={styles.notesInfoBox}>
                  <MaterialCommunityIcons
                    name="clipboard-check-outline"
                    size={15}
                    color={Colors.primaryDark}
                  />
                  <Text style={styles.notesInfoText}>
                    Notes médicales : {item.notes}
                  </Text>
                </View>
              )}

              {(item.rejectionReason || item.cancellationReason) && (
                <View style={styles.cancelNoteBox}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={16}
                    color={Colors.error}
                  />
                  <Text style={styles.cancelNoteText}>
                    {item.status === 'rejected'
                      ? `Motif du refus : ${item.rejectionReason}`
                      : `Motif d’annulation : ${item.cancellationReason}`}
                  </Text>
                </View>
              )}

              {/* Actions for Pending Requests */}
              {item.status === 'pending' && (
                <View style={styles.actionButtonsRow}>
                  <SecondaryButton
                    title="Refuser"
                    variant="outline"
                    size="sm"
                    disabled={processingId === item.id}
                    onPress={() => openActionModal(item, 'reject')}
                    style={{ flex: 1, borderColor: Colors.error }}
                    textStyle={{ color: Colors.error }}
                  />
                  <PrimaryButton
                    title="Confirmer la demande"
                    size="sm"
                    loading={processingId === item.id}
                    onPress={() => handleConfirmRequest(item)}
                    style={{ flex: 1.5 }}
                  />
                </View>
              )}

              {/* Actions for Confirmed Appointments (Mark Completed OR Cancel under rules) */}
              {item.status === 'confirmed' && (
                <View style={styles.actionButtonsRow}>
                  <SecondaryButton
                    title="Annuler"
                    variant="outline"
                    size="sm"
                    disabled={processingId === item.id}
                    onPress={() => openActionModal(item, 'cancel')}
                    style={{ flex: 1, borderColor: Colors.error }}
                    textStyle={{ color: Colors.error }}
                  />
                  <PrimaryButton
                    title="Marquer comme terminé"
                    size="sm"
                    loading={processingId === item.id}
                    onPress={() => openActionModal(item, 'complete')}
                    style={{ flex: 1.5 }}
                  />
                </View>
              )}
            </Card>
          ))
        ) : (
          <EmptyState
            title={
              activeFilter === 'requests'
                ? 'Aucune demande en attente'
                : activeFilter === 'confirmed'
                  ? 'Aucun rendez-vous confirmé'
                  : activeFilter === 'past'
                    ? 'Aucune consultation terminée'
                    : 'Aucune annulation ou refus'
            }
            description="Les rendez-vous correspondant à cette catégorie s'afficheront ici en temps réel."
          />
        )}
      </ScrollView>

      {/* Action Modal (Reject, Cancel, Complete) */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card padding="lg" style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {actionType === 'reject'
                ? 'Refuser la demande de rendez-vous'
                : actionType === 'cancel'
                  ? 'Annuler le rendez-vous confirmé'
                  : 'Clôturer la consultation médicale'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Patient : {selectedAptForAction?.patientName || 'Patient'} •{' '}
              {selectedAptForAction
                ? `${formatDateShortFr(selectedAptForAction.date)} à ${selectedAptForAction.time}`
                : ''}
            </Text>

            <CustomInput
              label={
                actionType === 'complete'
                  ? 'Notes de suivi médical (facultatif)'
                  : 'Motif communiqué au patient (obligatoire)'
              }
              value={actionText}
              onChangeText={setActionText}
              multiline
              numberOfLines={3}
              inputStyle={{ minHeight: 72, textAlignVertical: 'top' }}
            />

            <View style={styles.modalBtnRow}>
              <SecondaryButton
                title="Retour"
                size="sm"
                onPress={() => setActionModalVisible(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title={
                  actionType === 'reject'
                    ? 'Confirmer le refus'
                    : actionType === 'cancel'
                      ? 'Confirmer l’annulation'
                      : 'Valider la consultation'
                }
                size="sm"
                loading={Boolean(processingId)}
                onPress={handleSubmitActionModal}
                style={[
                  { flex: 1.4 },
                  actionType !== 'complete' && {
                    backgroundColor: Colors.error,
                  },
                ]}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterBarWrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  appointmentCard: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  patientInfo: {
    flex: 1,
  },
  refCodeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.secondaryText,
  },
  patientName: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  patientPhone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  reasonLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
  },
  reasonText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    flex: 1,
  },
  notesInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  notesInfoText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.primaryDark,
    flex: 1,
  },
  cancelNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  cancelNoteText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.error,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
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
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
