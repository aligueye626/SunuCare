import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native';
import { Colors, Typography } from '@/constants/theme';

export type TextVariant =
  | 'hero'
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'bodySmall'
  | 'caption'
  | 'label';

export type TextColor =
  | 'default'
  | 'secondary'
  | 'primary'
  | 'secondaryBrand'
  | 'white'
  | 'error'
  | 'success'
  | 'gold';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  weight?: keyof typeof Typography.fontWeight;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function AppText({
  variant = 'body',
  color = 'default',
  align = 'left',
  weight,
  children,
  style,
  ...rest
}: AppTextProps) {
  return (
    <RNText
      style={[
        styles.base,
        styles[variant],
        styles[`color_${color}`],
        { textAlign: align },
        weight && { fontWeight: Typography.fontWeight[weight] },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.text,
  },
  hero: {
    fontSize: Typography.fontSize.hero,
    lineHeight: Typography.lineHeight.hero,
    fontWeight: Typography.fontWeight.bold,
  },
  display: {
    fontSize: Typography.fontSize.display,
    lineHeight: Typography.lineHeight.display,
    fontWeight: Typography.fontWeight.bold,
  },
  h1: {
    fontSize: Typography.fontSize.xxl,
    lineHeight: Typography.lineHeight.xxl,
    fontWeight: Typography.fontWeight.bold,
  },
  h2: {
    fontSize: Typography.fontSize.xl,
    lineHeight: Typography.lineHeight.xl,
    fontWeight: Typography.fontWeight.semiBold,
  },
  h3: {
    fontSize: Typography.fontSize.lg,
    lineHeight: Typography.lineHeight.lg,
    fontWeight: Typography.fontWeight.semiBold,
  },
  body: {
    fontSize: Typography.fontSize.md,
    lineHeight: Typography.lineHeight.md,
    fontWeight: Typography.fontWeight.regular,
  },
  bodyMedium: {
    fontSize: Typography.fontSize.md,
    lineHeight: Typography.lineHeight.md,
    fontWeight: Typography.fontWeight.medium,
  },
  bodySmall: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.sm,
    fontWeight: Typography.fontWeight.regular,
  },
  caption: {
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.lineHeight.xs,
    fontWeight: Typography.fontWeight.regular,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.sm,
    fontWeight: Typography.fontWeight.semiBold,
    letterSpacing: 0.3,
  },
  // Color variants
  color_default: {
    color: Colors.text,
  },
  color_secondary: {
    color: Colors.secondaryText,
  },
  color_primary: {
    color: Colors.primary,
  },
  color_secondaryBrand: {
    color: Colors.secondary,
  },
  color_white: {
    color: Colors.white,
  },
  color_error: {
    color: Colors.error,
  },
  color_success: {
    color: Colors.success,
  },
  color_gold: {
    color: Colors.accentGold,
  },
});

export default AppText;

