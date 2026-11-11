import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { DoctorListItem } from '@/types/doctor';
import { formatFCFA } from '@/utils/formatters';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';

export interface DoctorCardProps {
  doctor: DoctorListItem;
  onPress?: () => void;
  onFavoriteToggle?: () => void;
}

export function DoctorCard({
  doctor,
  onPress,
  onFavoriteToggle,
}: DoctorCardProps) {
  const isVerified = doctor.verificationStatus === 'verified';
  const nextSlot =
    doctor.nextAvailableSlot ||
    doctor.nextAvailableLabel ||
    'Disponible cette semaine';
  const hasTeleconsultation =
    doctor.consultationTypes?.includes('teleconsultation');

  return (
    <Card onPress={onPress} padding="md" style={styles.card}>
      <View style={styles.headerRow}>
        {/* Professional Image / Avatar */}
        <Avatar
          name={doctor.fullName}
          uri={doctor.avatarUrl}
          size="lg"
          verified={isVerified}
          style={styles.avatar}
        />

        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {doctor.fullName}
            </Text>
            {onFavoriteToggle && (
              <Pressable
                onPress={onFavoriteToggle}
                hitSlop={10}
                accessibilityLabel="Ajouter aux favoris"
              >
                <MaterialCommunityIcons
                  name={doctor.isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={
                    doctor.isFavorite ? Colors.error : Colors.secondaryText
                  }
                />
              </Pressable>
            )}
          </View>

          {/* Specialty */}
          <Text style={styles.specialty}>{doctor.specialty}</Text>

          {/* Facility & Neighborhood */}
          <View style={styles.locationRow}>
            <MaterialCommunityIcons
              name="hospital-building"
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {doctor.clinicName} • {doctor.district}, Dakar
            </Text>
          </View>

          {/* Next Available Appointment Pill */}
          <View style={styles.availabilityRow}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={14}
              color={Colors.success}
            />
            <Text style={styles.availabilityText} numberOfLines={1}>
              Prochain RDV : {nextSlot}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.badgeGroup}>
          {isVerified ? (
            <Badge label="Vérifié" variant="verified" size="sm" />
          ) : (
            <Badge label="En attente" variant="pending" size="sm" />
          )}

          {hasTeleconsultation && (
            <Badge
              label="Vidéo"
              variant="secondary"
              icon="video-outline"
              size="sm"
            />
          )}

          <View style={styles.ratingRow}>
            <MaterialCommunityIcons
              name="star"
              size={14}
              color={Colors.accentGold}
            />
            <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({doctor.reviewCount})</Text>
          </View>
        </View>

        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Consultation</Text>
          <Text style={styles.feeValue}>
            {formatFCFA(doctor.consultationFeeFCFA)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: Spacing.md,
  },
  mainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  specialty: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semiBold,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    flex: 1,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    backgroundColor: Colors.successLight,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs + 3,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  availabilityText: {
    fontSize: Typography.fontSize.xs - 1,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.success,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    flex: 1,
    marginRight: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  ratingText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginLeft: 2,
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  feeLabel: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feeValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});

export default DoctorCard;
