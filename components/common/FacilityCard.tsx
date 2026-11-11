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
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { MedicalFacility } from '@/types/facility';
import { Badge } from './Badge';

export interface FacilityCardProps {
  facility: MedicalFacility;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function FacilityCard({ facility, onPress, style }: FacilityCardProps) {
  const getFacilityIcon = () => {
    switch (facility.type) {
      case 'hopital':
        return 'hospital-building';
      case 'clinique':
        return 'hospital';
      case 'laboratoire':
        return 'test-tube';
      default:
        return 'plus-box';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={getFacilityIcon()} size={28} color={Colors.primary} />
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {facility.name}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={14}
              color={Colors.secondaryText}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {facility.district}, Dakar • {facility.address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={14} color={Colors.accentGold} />
          <Text style={styles.ratingText}>{facility.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({facility.reviewCount} avis)</Text>
        </View>

        <View style={styles.badgesGroup}>
          {facility.isOpen24h && (
            <Badge label="24h/24" variant="primary" size="sm" />
          )}
          {facility.emergencyAvailable && (
            <Badge label="Urgences" variant="gold" size="sm" />
          )}
        </View>
      </View>

      {facility.availableSpecialties.length > 0 && (
        <View style={styles.specialtiesRow}>
          <Text style={styles.specialtiesText} numberOfLines={1}>
            Pôles : {facility.availableSpecialties.slice(0, 3).join(' • ')}
          </Text>
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  locationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginLeft: 3,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginLeft: 3,
  },
  badgesGroup: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  specialtiesRow: {
    marginTop: Spacing.xs + 2,
  },
  specialtiesText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default FacilityCard;

