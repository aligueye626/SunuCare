import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from '@/constants/theme';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { CustomInput } from '@/components/common/CustomInput';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { useAuth } from '@/context/AuthContext';
import { isValidEmail, isValidSenegalPhone } from '@/utils/validators';

const PRESET_AVATARS = [
  {
    label: 'Initiales',
    uri: '',
  },
  {
    label: 'Portrait 1',
    uri: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Portrait 2',
    uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Portrait 3',
    uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  },
];

export default function PatientProfileScreen() {
  const router = useRouter();
  const { user, logout, role, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(user?.firstName || 'Fatou');
  const [lastName, setLastName] = useState(user?.lastName || 'Diop');
  const [email, setEmail] = useState(user?.email || 'patient@sunucare.sn');
  const [phone, setPhone] = useState(user?.phone || '+221 77 987 65 43');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [smsRemindersEnabled, setSmsRemindersEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const displayName = user?.fullName || `${firstName} ${lastName}`.trim() || 'Patient SunuCare';
  const displayPhone = user?.phone || phone || '+221 77 987 65 43';
  const displayEmail = user?.email || email || 'patient@sunucare.sn';
  const isDoctor = role === 'doctor';

  const handleSaveProfile = async () => {
    setFormError(null);
    setSaveSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Le prénom et le nom sont obligatoires.');
      return;
    }

    if (!isValidEmail(email.trim())) {
      setFormError('Veuillez renseigner une adresse email valide.');
      return;
    }

    if (!isValidSenegalPhone(phone.trim())) {
      setFormError(
        'Numéro sénégalais invalide. Format attendu : +221 77 XXX XX XX.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });

      if (success) {
        setSaveSuccess('Votre profil patient a été enregistré avec succès.');
        setIsEditing(false);
      } else {
        setFormError('Impossible de sauvegarder les modifications. Veuillez réessayer.');
      }
    } catch (e: any) {
      setFormError(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormError(null);
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
    }
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>Mon Profil Patient</Text>
            {!isEditing && (
              <Pressable
                onPress={() => {
                  setSaveSuccess(null);
                  setIsEditing(true);
                }}
                style={styles.editTriggerBtn}
              >
                <MaterialCommunityIcons
                  name="account-edit-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.editTriggerText}>Modifier</Text>
              </Pressable>
            )}
          </View>

          {saveSuccess && (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={Colors.success}
              />
              <Text style={styles.successBannerText}>{saveSuccess}</Text>
            </View>
          )}

          {/* User Profile Summary Card */}
          <Card padding="md" style={styles.userCard}>
            <View style={styles.userRow}>
              <Avatar
                name={displayName}
                uri={isEditing ? avatarUrl || undefined : user?.avatarUrl}
                size="xl"
                verified={isDoctor}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userPhone}>{displayPhone}</Text>
                <Text style={styles.userEmail}>{displayEmail}</Text>
                <View style={styles.badgeRow}>
                  <Badge
                    label={isDoctor ? 'Compte Médecin' : 'Compte Patient'}
                    variant={isDoctor ? 'gold' : 'primary'}
                    size="sm"
                  />
                  <Badge
                    label="Dakar, Sénégal"
                    variant="secondary"
                    size="sm"
                  />
                </View>
              </View>
            </View>
          </Card>

          {/* Editable Patient Information Section */}
          <Text style={styles.sectionTitle}>Informations Personnelles</Text>
          <Card padding="md" style={styles.formCard}>
            {formError && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={18}
                  color={Colors.error}
                />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            )}

            {isEditing ? (
              <View>
                {/* Profile Picture Selector */}
                <Text style={styles.fieldLabel}>Photo de profil</Text>
                <View style={styles.avatarPresetRow}>
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.uri;
                    return (
                      <Pressable
                        key={preset.label}
                        onPress={() => setAvatarUrl(preset.uri)}
                        style={[
                          styles.avatarPresetChip,
                          isSelected && styles.avatarPresetChipActive,
                        ]}
                      >
                        <Avatar
                          name={`${firstName} ${lastName}`}
                          uri={preset.uri || undefined}
                          size="sm"
                        />
                        <Text
                          style={[
                            styles.avatarPresetText,
                            isSelected && styles.avatarPresetTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <CustomInput
                  label="URL personnalisée de photo de profil (optionnel)"
                  placeholder="https://exemple.com/ma-photo.jpg"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  leftIcon="image-outline"
                  autoCapitalize="none"
                />

                <CustomInput
                  label="Prénom"
                  placeholder="Ex: Fatou"
                  value={firstName}
                  onChangeText={setFirstName}
                  leftIcon="account-outline"
                />

                <CustomInput
                  label="Nom de famille"
                  placeholder="Ex: Diop"
                  value={lastName}
                  onChangeText={setLastName}
                  leftIcon="account-details-outline"
                />

                <CustomInput
                  label="Adresse email"
                  placeholder="Ex: fatou.diop@email.sn"
                  value={email}
                  onChangeText={setEmail}
                  leftIcon="email-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <CustomInput
                  label="Téléphone sénégalais (+221)"
                  placeholder="+221 77 987 65 43"
                  value={phone}
                  onChangeText={setPhone}
                  leftIcon="phone-outline"
                  keyboardType="phone-pad"
                />

                <View style={styles.editActionsRow}>
                  <SecondaryButton
                    title="Annuler"
                    onPress={handleCancelEdit}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    title="Enregistrer"
                    loading={isSaving}
                    onPress={handleSaveProfile}
                    icon="content-save-check-outline"
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.infoDisplayRow}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <View style={styles.infoDisplayContent}>
                    <Text style={styles.infoDisplayLabel}>Prénom</Text>
                    <Text style={styles.infoDisplayValue}>
                      {user?.firstName || firstName}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoDisplayRow}>
                  <MaterialCommunityIcons
                    name="account-details-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <View style={styles.infoDisplayContent}>
                    <Text style={styles.infoDisplayLabel}>Nom de famille</Text>
                    <Text style={styles.infoDisplayValue}>
                      {user?.lastName || lastName}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoDisplayRow}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <View style={styles.infoDisplayContent}>
                    <Text style={styles.infoDisplayLabel}>Adresse email</Text>
                    <Text style={styles.infoDisplayValue}>{displayEmail}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoDisplayRow}>
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <View style={styles.infoDisplayContent}>
                    <Text style={styles.infoDisplayLabel}>Téléphone</Text>
                    <Text style={styles.infoDisplayValue}>{displayPhone}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoDisplayRow}>
                  <MaterialCommunityIcons
                    name="shield-lock-outline"
                    size={20}
                    color={Colors.secondary}
                  />
                  <View style={styles.infoDisplayContent}>
                    <Text style={styles.infoDisplayLabel}>Type de compte</Text>
                    <Text style={styles.infoDisplayValue}>
                      {isDoctor ? 'Médecin (Fixe)' : 'Patient (Fixe)'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* App Preferences */}
          <Text style={styles.sectionTitle}>Préférences & Notifications</Text>
          <Card padding="none" style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.settingLabel}>Rappels de rendez-vous</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.border, true: Colors.secondary }}
                thumbColor={notificationsEnabled ? Colors.primary : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.settingLabel}>
                Confirmation par SMS (+221)
              </Text>
              <Switch
                value={smsRemindersEnabled}
                onValueChange={setSmsRemindersEnabled}
                trackColor={{ false: Colors.border, true: Colors.secondary }}
                thumbColor={smsRemindersEnabled ? Colors.primary : '#f4f3f4'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <MaterialCommunityIcons
                name="cash"
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.settingLabel}>Devise par défaut</Text>
              <Text style={styles.settingValue}>FCFA (XOF)</Text>
            </View>
          </Card>

          {/* Support & Legal */}
          <Text style={styles.sectionTitle}>Support & Sécurité</Text>
          <Card padding="none" style={styles.settingsCard}>
            <Pressable
              onPress={() => router.push('/modal')}
              style={({ pressed }) => [
                styles.clickableRow,
                pressed && styles.rowPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.settingLabel}>À propos de SunuCare</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.secondaryText}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              onPress={() =>
                Alert.alert(
                  'Assistance SunuCare Dakar',
                  'Centre d’aide SunuCare : contact@sunucare.sn • +221 33 800 00 00'
                )
              }
              style={({ pressed }) => [
                styles.clickableRow,
                pressed && styles.rowPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="headset"
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.settingLabel}>
                Assistance & Contact Dakar
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.secondaryText}
              />
            </Pressable>
          </Card>

          {/* Sign Out Button */}
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.rowPressed,
            ]}
          >
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color={Colors.error}
            />
            <Text style={styles.signOutText}>Se déconnecter de SunuCare</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  editTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  editTriggerText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  successBannerText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.success,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorBannerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  userCard: {
    marginBottom: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  userPhone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  userEmail: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  formCard: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  avatarPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  avatarPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 6,
  },
  avatarPresetChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  avatarPresetText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  avatarPresetTextActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  infoDisplayContent: {
    flex: 1,
  },
  infoDisplayLabel: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
  },
  infoDisplayValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
    marginTop: 1,
  },
  settingsCard: {
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  settingLabel: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  settingValue: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.errorLight,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  signOutText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.error,
  },
});
