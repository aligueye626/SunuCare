import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { DoctorVerificationStatus } from '@/types/user';

export type BadgeVariant =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'success'
  | 'warning'
  | 'primary'
  | 'secondary'
  | 'neutral'
  | 'gold';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  label,
  variant = 'neutral',
  icon,
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  const getAutoIcon = () => {
    if (icon) return icon;
    if (variant === 'verified') return 'check-decagram';
    if (variant === 'pending') return 'clock-outline';
    if (variant === 'rejected') return 'alert-circle-outline';
    return undefined;
  };

  const badgeIcon = getAutoIcon();
  const iconColor = iconColors[variant] || Colors.textSecondary;

  return (
    <View
      style={[
        styles.badge,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        style,
      ]}
    >
      {badgeIcon && (
        <MaterialCommunityIcons
          name={badgeIcon}
          size={size === 'sm' ? 12 : 14}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          styles[`text_${size}`],
          styles[`text_${variant}`],
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Convenience component for Doctor Verification Status
 */
export function DoctorVerificationBadge({
  status,
  size = 'md',
}: {
  status: DoctorVerificationStatus;
  size?: 'sm' | 'md';
}) {
  const configs: Record<DoctorVerificationStatus, { label: string; variant: BadgeVariant }> = {
    verified: { label: 'Médecin Vérifié', variant: 'verified' },
    pending: { label: 'En attente de vérification', variant: 'pending' },
    rejected: { label: 'Non vérifié', variant: 'rejected' },
  };

  const current = configs[status] || configs.pending;

  return <Badge label={current.label} variant={current.variant} size={size} />;
}

const iconColors: Record<BadgeVariant, string> = {
  verified: Colors.primary,
  pending: Colors.warning,
  rejected: Colors.error,
  success: Colors.success,
  warning: Colors.warning,
  primary: Colors.primary,
  secondary: Colors.secondary,
  neutral: Colors.secondaryText,
  gold: Colors.accentGold,
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.pill,
  },
  size_sm: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  icon: {
    marginRight: 4,
  },
  // Variants
  variant_verified: {
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.2)',
  },
  variant_pending: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  variant_rejected: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: 'rgba(224, 82, 82, 0.25)',
  },
  variant_primary: {
    backgroundColor: Colors.secondaryLight,
  },
  variant_secondary: {
    backgroundColor: '#E0F7F4',
  },
  variant_neutral: {
    backgroundColor: Colors.surfaceMuted,
  },
  variant_gold: {
    backgroundColor: Colors.accentGoldLight,
  },
  variant_success: {
    backgroundColor: Colors.successLight,
  },
  variant_warning: {
    backgroundColor: Colors.warningLight,
  },
  // Text
  text: {
    fontWeight: Typography.fontWeight.medium,
  },
  text_sm: {
    fontSize: Typography.fontSize.xs - 1,
    lineHeight: Typography.lineHeight.xs - 2,
  },
  text_md: {
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.lineHeight.xs,
  },
  text_verified: {
    color: Colors.primary,
  },
  text_pending: {
    color: '#B45309',
  },
  text_rejected: {
    color: Colors.error,
  },
  text_success: {
    color: Colors.success,
  },
  text_warning: {
    color: '#B45309',
  },
  text_primary: {
    color: Colors.primary,
  },
  text_secondary: {
    color: Colors.primaryDark,
  },
  text_neutral: {
    color: Colors.secondaryText,
  },
  text_gold: {
    color: '#92400E',
  },
});

export default Badge;

