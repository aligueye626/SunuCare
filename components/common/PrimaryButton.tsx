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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  leftIcon,
  rightIcon,
  fullWidth = false,
  size = 'md',
  style,
  textStyle,
}: PrimaryButtonProps) {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={!isInteractive}
      style={({ pressed }) => [
        styles.base,
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
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <View style={styles.content}>
          {(leftIcon || icon) && (
            <View style={styles.leftIconContainer}>
              {leftIcon || (
                <MaterialCommunityIcons
                  name={icon as any}
                  size={18}
                  color={Colors.white}
                />
              )}
            </View>
          )}
          <Text
            style={[
              styles.text,
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
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Shadows.sm,
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
    opacity: 0.9,
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: Colors.border,
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
    color: Colors.white,
    fontWeight: Typography.fontWeight.semiBold,
    textAlign: 'center',
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

export default PrimaryButton;

