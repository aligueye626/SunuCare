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
import { MedicalSpecialtyItem } from '@/types/specialty';

export interface SpecialtyCardProps {
  specialty: MedicalSpecialtyItem;
  onPress: () => void;
  selected?: boolean;
  variant?: 'grid' | 'carousel';
  style?: StyleProp<ViewStyle>;
}

export function SpecialtyCard({
  specialty,
  onPress,
  selected = false,
  variant = 'carousel',
  style,
}: SpecialtyCardProps) {
  const iconColor = specialty.color || Colors.primary;

  if (variant === 'grid') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.gridCard,
          selected && styles.gridCardSelected,
          pressed && styles.pressed,
          style,
        ]}
      >
        <View style={[styles.gridIconCircle, { backgroundColor: `${iconColor}15` }]}>
          <MaterialCommunityIcons name={specialty.icon} size={28} color={iconColor} />
        </View>
        <Text style={styles.gridName} numberOfLines={1}>
          {specialty.name}
        </Text>
        <Text style={styles.gridDoctorCount}>
          {specialty.doctorCount} praticiens
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.carouselItem,
        selected && styles.carouselItemSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.carouselIconCircle, { backgroundColor: `${iconColor}15` }]}>
        <MaterialCommunityIcons name={specialty.icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.carouselLabel} numberOfLines={1}>
        {specialty.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  // Carousel variant
  carouselItem: {
    alignItems: 'center',
    width: 82,
    marginRight: Spacing.sm,
  },
  carouselItemSelected: {
    opacity: 1,
  },
  carouselIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  carouselLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  // Grid variant
  gridCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
    width: '48%',
    marginBottom: Spacing.md,
  },
  gridCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  gridIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  gridName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  gridDoctorCount: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
});

export default SpecialtyCard;

