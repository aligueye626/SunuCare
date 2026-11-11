import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/theme';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  onPress,
  variant = 'elevated',
  padding = 'md',
  children,
  style,
  ...rest
}: CardProps) {
  const paddingStyle = styles[`padding_${padding}`];
  const variantStyle = styles[`variant_${variant}`];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          variantStyle,
          paddingStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.base, variantStyle, paddingStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  // Variants
  variant_elevated: {
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  variant_outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  variant_flat: {
    backgroundColor: Colors.surfaceMuted,
  },
  // Paddings
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: Spacing.sm,
  },
  padding_md: {
    padding: Spacing.base,
  },
  padding_lg: {
    padding: Spacing.xl,
  },
});

export default Card;

