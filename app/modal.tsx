import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { APP_CONFIG } from '@/constants/config';
import { Card } from '@/components/common/Card';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="heart-pulse" size={36} color={Colors.white} />
        </View>

        <Text style={styles.title}>{APP_CONFIG.name}</Text>
        <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>

        <Card padding="md" style={styles.card}>
          <Text style={styles.infoTitle}>À propos</Text>
          <Text style={styles.infoText}>
            SunuCare est une application innovante facilitant la prise de rendez-vous avec les médecins
            et professionnels de santé à Dakar, Sénégal.
          </Text>
          <Text style={[styles.infoText, { marginTop: Spacing.sm }]}>
            Nos praticiens partenaires sont soumis à une vérification rigoureuse auprès de l'Ordre des
            Médecins du Sénégal avant la mise en ligne de leurs profils.
          </Text>
        </Card>

        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>Dakar, Sénégal</Text>
          <Text style={styles.badgeBullet}>•</Text>
          <Text style={styles.badgeText}>Devise : {APP_CONFIG.currency.symbol}</Text>
          <Text style={styles.badgeBullet}>•</Text>
          <Text style={styles.badgeText}>Version 1.0.0</Text>
        </View>
      </View>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  tagline: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.text,
    lineHeight: Typography.lineHeight.xs + 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
  },
  badgeBullet: {
    color: Colors.secondaryText,
    fontSize: Typography.fontSize.xs,
  },
});
