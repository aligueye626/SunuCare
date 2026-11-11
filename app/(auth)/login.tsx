import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { CustomInput } from '@/components/common/CustomInput';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setErrorMessage(result.error || 'Identifiants invalides.');
    }
  };

  const fillQuickCredentials = (role: 'patient' | 'doctor' | 'admin') => {
    if (role === 'admin') {
      setEmail('admin@sunucare.sn');
      setPassword('sunucare2026');
    } else if (role === 'doctor') {
      setEmail('doctor@sunucare.sn');
      setPassword('sunucare2026');
    } else {
      setEmail('patient@sunucare.sn');
      setPassword('sunucare2026');
    }
    setErrorMessage('');
  };

  return (
    <ScreenWrapper scrollable>
      <CustomHeader showBack title="Connexion" />

      <View style={styles.content}>
        {/* Header Branding */}
        <View style={styles.branding}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="account-lock-outline" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Bienvenue sur SunuCare</Text>
          <Text style={styles.subtitle}>
            Connectez-vous pour accéder à vos rendez-vous et vos soins médicaux à Dakar
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <CustomInput
            label="Email"
            required
            placeholder="votre.email@exemple.sn"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errorMessage) setErrorMessage('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={Colors.secondaryText}
              />
            }
          />

          <CustomInput
            label="Mot de passe"
            required
            placeholder="Votre mot de passe"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (errorMessage) setErrorMessage('');
            }}
            secureTextEntry
            leftIcon={
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={Colors.secondaryText}
              />
            }
            error={errorMessage}
          />

          <View style={styles.forgotPasswordContainer}>
            <SecondaryButton
              title="Mot de passe oublié ?"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(auth)/forgot-password')}
              textStyle={styles.forgotPasswordText}
            />
          </View>

          <PrimaryButton
            title="Se connecter"
            onPress={handleLogin}
            loading={isLoading}
            size="lg"
            fullWidth
            style={styles.submitButton}
          />
        </View>

        {/* Demo Credentials Pill */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>Comptes de test prédéfinis :</Text>
          <View style={styles.demoButtonsRow}>
            <SecondaryButton
              title="Patient"
              variant="mint"
              size="sm"
              onPress={() => fillQuickCredentials('patient')}
              style={{ flex: 1 }}
            />
            <SecondaryButton
              title="Médecin"
              variant="mint"
              size="sm"
              onPress={() => fillQuickCredentials('doctor')}
              style={{ flex: 1 }}
            />
            <SecondaryButton
              title="Admin Interne"
              variant="outline"
              size="sm"
              onPress={() => fillQuickCredentials('admin')}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous n'avez pas encore de compte ?</Text>
          <SecondaryButton
            title="Créer un compte patient ou médecin"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(auth)/register')}
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
    marginVertical: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    paddingHorizontal: Spacing.md,
    lineHeight: Typography.lineHeight.sm + 2,
  },
  form: {
    marginVertical: Spacing.md,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
  demoCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  demoTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
  },
});
