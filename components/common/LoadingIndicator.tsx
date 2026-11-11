import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';

export interface LoadingIndicatorProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
}

export function LoadingIndicator({
  message = 'Chargement en cours...',
  fullScreen = false,
  size = 'large',
  style,
}: LoadingIndicatorProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});

export default LoadingIndicator;

