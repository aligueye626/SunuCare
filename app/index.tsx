import React from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { APP_CONFIG } from '@/constants/config';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtle African Identity Accent Line */}
        <View style={styles.topAccentBar}>
          <View style={[styles.accentStrip, { backgroundColor: Colors.primary }]} />
          <View style={[styles.accentStrip, { backgroundColor: Colors.accentGold }]} />
          <View style={[styles.accentStrip, { backgroundColor: Colors.secondary }]} />
        </View>

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="heart-pulse" size={28} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.brandTitle}>{APP_CONFIG.name}</Text>
              <Text style={styles.brandSubtitle}>Santé & Bien-être • Dakar</Text>
            </View>
          </View>

          <View style={styles.locationPill}>
            <MaterialCommunityIcons name="map-marker" size={14} color={Colors.primary} />
            <Text style={styles.locationText}>Dakar, Sénégal</Text>
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIconCircle}>
            <MaterialCommunityIcons name="stethoscope" size={44} color={Colors.primary} />
          </View>

          <View style={styles.trustBadge}>
            <MaterialCommunityIcons name="shield-check" size={16} color={Colors.primary} />
            <Text style={styles.trustBadgeText}>Praticiens vérifiés & certifiés</Text>
          </View>

          <Text style={styles.heroTagline}>{APP_CONFIG.tagline}</Text>

          <Text style={styles.heroTitle}>
            Prenez rendez-vous médical en toute simplicité
          </Text>

          <Text style={styles.heroDescription}>
            Trouvez les meilleurs médecins, spécialistes et cliniques à Dakar (Plateau, Almadies,
            Mermoz, Parcelles). Réservez en ligne 24h/24 sans attente.
          </Text>
        </View>

        {/* Value Highlights */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconContainer, { backgroundColor: Colors.secondaryLight }]}>
              <MaterialCommunityIcons name="calendar-check" size={22} color={Colors.primary} />
            </View>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>Réservation 24h/24</Text>
              <Text style={styles.featureDescription}>
                Choisissez le créneau qui vous convient dans les meilleures structures de Dakar.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconContainer, { backgroundColor: Colors.accentGoldLight }]}>
              <MaterialCommunityIcons name="cash-multiple" size={22} color={Colors.accentGold} />
            </View>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>Tarifs transparents en FCFA</Text>
              <Text style={styles.featureDescription}>
                Honoraires de consultation clairs affichés à l'avance sans surprise.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="shield-account-outline" size={22} color="#0284C7" />
            </View>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>Praticiens certifiés</Text>
              <Text style={styles.featureDescription}>
                Vérification officielle auprès de l'Ordre National des Médecins du Sénégal.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <PrimaryButton
            title="Commencer"
            onPress={() => router.push('/(auth)/login')}
            size="lg"
            fullWidth
            rightIcon={
              <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.white} />
            }
          />

          <View style={styles.secondaryActionsRow}>
            <SecondaryButton
              title="Se connecter"
              onPress={() => router.push('/(auth)/login')}
              variant="outline"
              size="md"
              style={styles.halfButton}
            />
            <SecondaryButton
              title="Créer un compte"
              onPress={() => router.push('/(auth)/register')}
              variant="mint"
              size="md"
              style={styles.halfButton}
            />
          </View>
        </View>

        {/* Doctor Partnership Footer Banner */}
        <Pressable
          onPress={() => router.push('/(auth)/register?role=doctor' as any)}
          style={({ pressed }) => [
            styles.doctorBanner,
            pressed && styles.doctorBannerPressed,
          ]}
        >
          <View style={styles.doctorBannerIcon}>
            <MaterialCommunityIcons name="medical-bag" size={22} color={Colors.primary} />
          </View>
          <View style={styles.doctorBannerContent}>
            <Text style={styles.doctorBannerTitle}>Vous êtes professionnel de santé à Dakar ?</Text>
            <Text style={styles.doctorBannerSub}>
              Rejoignez le réseau SunuCare après authentification de votre licence médicale.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.secondaryText} />
        </Pressable>

        {/* Subtle Identity Footer */}
        <Text style={styles.footerCopyright}>
          SunuCare • Dakar, Sénégal • L’accès aux soins pour tous
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  topAccentBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  accentStrip: {
    flex: 1,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  brandTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    gap: 4,
  },
  locationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semiBold,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
    marginBottom: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    width: width,
    height: 120,
    backgroundColor: 'rgba(32, 184, 165, 0.08)',
    borderRadius: 999,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.sm,
  },
  trustBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primary,
  },
  heroTagline: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    lineHeight: Typography.lineHeight.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.sm + 4,
    color: Colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
  },
  featuresSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    lineHeight: Typography.lineHeight.xs + 2,
  },
  actionsSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  doctorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  doctorBannerPressed: {
    opacity: 0.85,
  },
  doctorBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  doctorBannerContent: {
    flex: 1,
  },
  doctorBannerTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  doctorBannerSub: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  footerCopyright: {
    textAlign: 'center',
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    marginTop: Spacing.xs,
  },
});
