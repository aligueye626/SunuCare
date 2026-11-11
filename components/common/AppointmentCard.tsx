import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';
import { Appointment, AppointmentStatus } from '@/types/appointment';
import { formatFCFA } from '@/utils/formatters';
import { Badge } from './Badge';

export interface AppointmentCardProps {
  appointment: Appointment;
  onPress: () => void;
  onDoctorProfilePress?: () => void;
  onDirectionsPress?: () => void;
  onCancelPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AppointmentCard({
  appointment,
  onPress,
  onDoctorProfilePress,
  onDirectionsPress,
  onCancelPress,
  style,
}: AppointmentCardProps) {
  const getStatusConfig = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Confirmé', variant: 'verified' as const };
      case 'pending':
        return { label: 'En attente', variant: 'pending' as const };
      case 'completed':
        return { label: 'Terminé', variant: 'neutral' as const };
      case 'rejected':
        return { label: 'Refusé', variant: 'rejected' as const };
      case 'cancelled':
        return { label: 'Annulé', variant: 'rejected' as const };
      default:
        return { label: status, variant: 'neutral' as const };
    }
  };

  const statusConfig = getStatusConfig(appointment.status);

  // Format date parts
  const dateObj = new Date(appointment.date);
  const dayNumber = isNaN(dateObj.getDate())
    ? '15'
    : String(dateObj.getDate()).padStart(2, '0');
  const monthName = isNaN(dateObj.getMonth())
    ? 'NOV'
    : dateObj.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();

  const consultationMode =
    (appointment.consultationType || appointment.type) === 'teleconsultation'
      ? 'Téléconsultation'
      : 'Au cabinet';

  const canCancel =
    appointment.status === 'pending' || appointment.status === 'confirmed';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={styles.topRow}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{dayNumber}</Text>
          <Text style={styles.dateMonth}>{monthName}</Text>
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.refRow}>
            <Text style={styles.refText}>
              Réf: {appointment.referenceCode || appointment.id}
            </Text>
          </View>
          <Text style={styles.doctorName} numberOfLines={1}>
            {appointment.doctorName}
          </Text>
          <Text style={styles.doctorSpecialty}>
            {appointment.doctorSpecialty}
          </Text>
          <View style={styles.timeRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={13}
              color={Colors.secondaryText}
            />
            <Text style={styles.timeText}>
              {appointment.time} • {consultationMode}
            </Text>
          </View>
        </View>

        <Badge
          label={statusConfig.label}
          variant={statusConfig.variant}
          size="sm"
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <View style={styles.locationContainer}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={14}
            color={Colors.secondaryText}
          />
          <Text style={styles.locationText} numberOfLines={1}>
            {appointment.clinicName} •{' '}
            {appointment.district || appointment.clinicAddress || 'Dakar'}
          </Text>
        </View>

        <View style={styles.feeContainer}>
          <Text style={styles.feeValue}>
            {formatFCFA(appointment.feeFCFA)}
          </Text>
        </View>
      </View>

      {(appointment.rejectionReason || appointment.cancellationReason) && (
        <View style={styles.reasonBanner}>
          <MaterialCommunityIcons
            name="information-outline"
            size={14}
            color={Colors.error}
          />
          <Text style={styles.reasonBannerText} numberOfLines={2}>
            {appointment.status === 'rejected'
              ? `Motif du refus : ${appointment.rejectionReason}`
              : `Motif d’annulation : ${appointment.cancellationReason}`}
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        {onDoctorProfilePress && (
          <Pressable
            onPress={onDoctorProfilePress}
            style={({ pressed }) => [
              styles.subActionBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="account-tie-outline"
              size={15}
              color={Colors.primary}
            />
            <Text style={styles.subActionText}>Profil médecin</Text>
          </Pressable>
        )}

        {onDirectionsPress && (
          <Pressable
            onPress={onDirectionsPress}
            style={({ pressed }) => [
              styles.subActionBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={15}
              color={Colors.primary}
            />
            <Text style={styles.subActionText}>Détails</Text>
          </Pressable>
        )}

        {onCancelPress && canCancel && (
          <Pressable
            onPress={onCancelPress}
            style={({ pressed }) => [
              styles.subActionBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={15}
              color={Colors.error}
            />
            <Text style={[styles.subActionText, { color: Colors.error }]}>
              Annuler
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    width: 50,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dateDay: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  dateMonth: {
    fontSize: Typography.fontSize.xs - 2,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  mainInfo: {
    flex: 1,
    paddingRight: Spacing.xs,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  refText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.secondaryText,
    letterSpacing: 0.3,
  },
  doctorName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  doctorSpecialty: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    marginTop: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  timeText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm + 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
    gap: 4,
  },
  locationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    flex: 1,
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  feeValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  reasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: 6,
  },
  reasonBannerText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.error,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  subActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  subActionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primary,
  },
});

export default AppointmentCard;
