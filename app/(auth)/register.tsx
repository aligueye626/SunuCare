import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { CustomInput } from '@/components/common/CustomInput';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';
import { formatToSenegalPhone } from '@/utils/validators';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { register, isLoading } = useAuth();

  const [role, setRole] = useState<UserRole>(
    params.role === 'doctor' ? 'doctor' : 'patient'
  );

  // Shared fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  // Doctor-specific fields
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityDistrict, setFacilityDistrict] = useState('Plateau');
  const [professionalPhone, setProfessionalPhone] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const handlePhoneChange = (val: string) => {
    // Only format when typing digits
    setPhone(val);
    if (errorMessage) setErrorMessage('');
  };

  const handleRegister = async () => {
    setErrorMessage('');

    if (role === 'doctor') {
      const result = await register({
        role: 'doctor',
        firstName,
        lastName,
        email,
        phone,
        password,
        passwordConfirmation,
        specialty,
        licenseNumber,
        facilityName,
        facilityAddress: facilityAddress || `${facilityDistrict}, Dakar`,
        facilityDistrict,
        professionalPhone: professionalPhone || phone,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Erreur lors de la création du compte médecin.');
      }
    } else {
      const result = await register({
        role: 'patient',
        firstName,
        lastName,
        email,
        phone,
        password,
        passwordConfirmation,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Erreur lors de la création du compte patient.');
      }
    }
  };

  return (
    <ScreenWrapper scrollable>
      <CustomHeader showBack title="Inscription" />

      <View style={styles.content}>
        <Text style={styles.headerTitle}>Créer un compte</Text>
        <Text style={styles.headerSubtitle}>
          Rejoignez le réseau SunuCare pour des soins de santé plus proches de vous à Dakar
        </Text>

        {/* Role Selection Tabs */}
        <View style={styles.roleSelector}>
          <Pressable
            onPress={() => {
              setRole('patient');
              setErrorMessage('');
            }}
            style={[styles.roleCard, role === 'patient' && styles.roleCardActive]}
          >
            <MaterialCommunityIcons
              name="account"
              size={24}
              color={role === 'patient' ? Colors.primary : Colors.secondaryText}
            />
            <Text style={[styles.roleLabel, role === 'patient' && styles.roleLabelActive]}>
              Compte Patient
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setRole('doctor');
              setErrorMessage('');
            }}
            style={[styles.roleCard, role === 'doctor' && styles.roleCardActive]}
          >
            <MaterialCommunityIcons
              name="doctor"
              size={24}
              color={role === 'doctor' ? Colors.primary : Colors.secondaryText}
            />
            <Text style={[styles.roleLabel, role === 'doctor' && styles.roleLabelActive]}>
              Médecin / Praticien
            </Text>
          </Pressable>
        </View>

        {/* Doctor Verification Notice */}
        {role === 'doctor' && (
          <View style={styles.verificationNotice}>
            <MaterialCommunityIcons
              name="shield-alert-outline"
              size={22}
              color={Colors.primary}
              style={styles.noticeIcon}
            />
            <View style={styles.noticeTextContainer}>
              <Text style={styles.noticeTitle}>Vérification manuelle requise (Statut En attente)</Text>
              <Text style={styles.noticeDescription}>
                Votre compte sera créé avec le statut <Text style={{ fontWeight: 'bold' }}>"En attente"</Text>.
                Vos informations seront examinées conformément aux directives de l'Ordre National des
                Médecins du Sénégal avant que votre profil ne devienne visible dans les résultats de
                recherche publics.
              </Text>
            </View>
          </View>
        )}

        {/* Shared Identity Fields */}
        <View style={styles.row}>
          <CustomInput
            label="Prénom"
            required
            placeholder="ex: Amadou"
            value={firstName}
            onChangeText={(v) => {
              setFirstName(v);
              if (errorMessage) setErrorMessage('');
            }}
            containerStyle={{ flex: 1 }}
          />
          <CustomInput
            label="Nom"
            required
            placeholder="ex: Sow"
            value={lastName}
            onChangeText={(v) => {
              setLastName(v);
              if (errorMessage) setErrorMessage('');
            }}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <CustomInput
          label="Adresse email"
          required
          placeholder="votre.email@exemple.sn"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errorMessage) setErrorMessage('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<MaterialCommunityIcons name="email-outline" size={20} color={Colors.secondaryText} />}
        />

        <CustomInput
          label="Numéro de téléphone sénégalais"
          required
          placeholder="+221 77 123 45 67"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          hint="Numéros acceptés : 70, 75, 76, 77, 78 ou 33 (Sénégal)"
          leftIcon={<MaterialCommunityIcons name="phone-outline" size={20} color={Colors.secondaryText} />}
        />

        {/* Doctor Additional Fields */}
        {role === 'doctor' && (
          <View style={styles.doctorFieldsContainer}>
            <Text style={styles.sectionHeaderLabel}>Informations Professionnelles Médicales</Text>

            <CustomInput
              label="Spécialité médicale"
              required
              placeholder="ex: Cardiologie, Pédiatrie, Généraliste..."
              value={specialty}
              onChangeText={(v) => {
                setSpecialty(v);
                if (errorMessage) setErrorMessage('');
              }}
              leftIcon={<MaterialCommunityIcons name="medical-bag" size={20} color={Colors.secondaryText} />}
            />

            <CustomInput
              label="Numéro d'Ordre des Médecins (si applicable)"
              placeholder="ex: OM-SN-2024-XXXX"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              hint="Nécessaire pour la vérification officielle de votre profil."
              leftIcon={<MaterialCommunityIcons name="badge-account-outline" size={20} color={Colors.secondaryText} />}
            />

            <CustomInput
              label="Nom de l'établissement ou cabinet à Dakar"
              required
              placeholder="ex: Clinique du Cap, Cabinet Médical..."
              value={facilityName}
              onChangeText={(v) => {
                setFacilityName(v);
                if (errorMessage) setErrorMessage('');
              }}
              leftIcon={<MaterialCommunityIcons name="hospital-building" size={20} color={Colors.secondaryText} />}
            />

            <View style={styles.row}>
              <CustomInput
                label="Quartier à Dakar"
                required
                placeholder="ex: Plateau, Almadies..."
                value={facilityDistrict}
                onChangeText={setFacilityDistrict}
                containerStyle={{ flex: 1 }}
              />
              <CustomInput
                label="Téléphone du cabinet"
                placeholder="+221 33 800 00 00"
                value={professionalPhone}
                onChangeText={setProfessionalPhone}
                keyboardType="phone-pad"
                containerStyle={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* Passwords */}
        <CustomInput
          label="Mot de passe"
          required
          placeholder="Au moins 6 caractères"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errorMessage) setErrorMessage('');
          }}
          secureTextEntry
          leftIcon={<MaterialCommunityIcons name="lock-outline" size={20} color={Colors.secondaryText} />}
        />

        <CustomInput
          label="Confirmation du mot de passe"
          required
          placeholder="Répétez le mot de passe"
          value={passwordConfirmation}
          onChangeText={(v) => {
            setPasswordConfirmation(v);
            if (errorMessage) setErrorMessage('');
          }}
          secureTextEntry
          error={errorMessage}
          leftIcon={<MaterialCommunityIcons name="lock-check-outline" size={20} color={Colors.secondaryText} />}
        />

        <PrimaryButton
          title={role === 'doctor' ? 'Créer mon compte médecin (Vérification en attente)' : 'Créer mon compte patient'}
          onPress={handleRegister}
          loading={isLoading}
          size="lg"
          fullWidth
          style={styles.submitButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
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
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.sm + 2,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
    minHeight: 52,
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  roleLabel: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.secondaryText,
  },
  roleLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  verificationNotice: {
    flexDirection: 'row',
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.25)',
    marginBottom: Spacing.lg,
  },
  noticeIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  noticeDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    lineHeight: Typography.lineHeight.xs + 2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  doctorFieldsContainer: {
    paddingTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionHeaderLabel: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryText,
  },
});
