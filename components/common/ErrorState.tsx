import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryTitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données pour le moment. Veuillez vérifier votre connexion.',
  onRetry,
  retryTitle = 'Réessayer',
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="alert-circle-outline" size={44} color={Colors.error} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <PrimaryButton
          title={retryTitle}
          onPress={onRetry}
          size="md"
          leftIcon={<MaterialCommunityIcons name="reload" size={18} color={Colors.white} />}
          style={styles.retryButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.sm + 2,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    minWidth: 160,
  },
});

export default ErrorState;

