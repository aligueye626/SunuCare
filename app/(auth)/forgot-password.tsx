import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { CustomInput } from '@/components/common/CustomInput';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleReset = async () => {
    if (!identifier.trim()) {
      setErrorMessage('Veuillez renseigner votre adresse email.');
      return;
    }
    setErrorMessage('');

    const res = await resetPassword(identifier.trim());
    if (res.success) {
      setFeedbackMessage(res.message);
      setIsSubmitted(true);
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <ScreenWrapper scrollable>
      <CustomHeader showBack title="Récupération" />

      <View style={styles.content}>
        {!isSubmitted ? (
          <>
            <View style={styles.branding}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="lock-reset" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Mot de passe oublié ?</Text>
              <Text style={styles.subtitle}>
                Entrez votre adresse email pour recevoir un lien officiel de réinitialisation de votre mot
                de passe SunuCare.
              </Text>
            </View>

            <View style={styles.form}>
              <CustomInput
                label="Adresse email"
                required
                placeholder="votre.email@exemple.sn"
                value={identifier}
                onChangeText={(val) => {
                  setIdentifier(val);
                  if (errorMessage) setErrorMessage('');
                }}
                error={errorMessage}
                leftIcon={
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={Colors.secondaryText}
                  />
                }
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <PrimaryButton
                title="Envoyer le lien de réinitialisation"
                onPress={handleReset}
                loading={isLoading}
                size="lg"
                fullWidth
                style={styles.submitButton}
              />
            </View>
          </>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons name="email-check-outline" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Email envoyé !</Text>
            <Text style={styles.subtitle}>
              {feedbackMessage ||
                `Un lien de réinitialisation a été transmis à ${identifier}. Veuillez vérifier votre boîte de réception.`}
            </Text>

            <PrimaryButton
              title="Retour à la connexion"
              onPress={() => router.push('/(auth)/login')}
              size="md"
              fullWidth
              style={styles.backButton}
            />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous vous souvenez de votre mot de passe ?</Text>
          <SecondaryButton
            title="Se connecter"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
  },
  branding: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.sm + 4,
    paddingHorizontal: Spacing.sm,
  },
  form: {
    marginVertical: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    marginTop: Spacing.xl,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
  },
});
