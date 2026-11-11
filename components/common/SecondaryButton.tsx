import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

export interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'outline' | 'ghost' | 'mint';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function SecondaryButton({
  title,
  onPress,
  variant = 'outline',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  size = 'md',
  style,
  textStyle,
}: SecondaryButtonProps) {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={!isInteractive}
      style={({ pressed }) => [
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        pressed && isInteractive && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'mint' ? Colors.primaryDark : Colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`text_${size}`],
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  // Variants
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_mint: {
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.2)',
  },
  // Sizes
  size_sm: {
    minHeight: 38,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
  },
  size_md: {
    minHeight: 48,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
  },
  size_lg: {
    minHeight: 56,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
  },
  // Text
  text: {
    fontWeight: Typography.fontWeight.semiBold,
    textAlign: 'center',
  },
  text_outline: {
    color: Colors.primary,
  },
  text_ghost: {
    color: Colors.primary,
  },
  text_mint: {
    color: Colors.primaryDark,
  },
  text_sm: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.sm,
  },
  text_md: {
    fontSize: Typography.fontSize.md,
    lineHeight: Typography.lineHeight.md,
  },
  text_lg: {
    fontSize: Typography.fontSize.lg,
    lineHeight: Typography.lineHeight.lg,
  },
  textDisabled: {
    color: Colors.secondaryText,
  },
  leftIconContainer: {
    marginRight: Spacing.sm,
  },
  rightIconContainer: {
    marginLeft: Spacing.sm,
  },
});

export default SecondaryButton;

