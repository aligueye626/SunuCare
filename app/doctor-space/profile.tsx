import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from '@/constants/theme';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { CustomInput } from '@/components/common/CustomInput';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { DoctorProfile } from '@/types/user';
import { formatFCFA } from '@/utils/formatters';
import { isValidEmail, isValidSenegalPhone } from '@/utils/validators';

const DAKAR_PARTNER_FACILITIES = [
  'Clinique du Cap',
  'Clinique de la Madeleine',
  'Hôpital Principal de Dakar',
  'Clinique Suma Assistance',
  'Centre Médical Pasteur',
  'Cabinet Médical Privé',
];

const MEDICAL_SPECIALTIES = [
  'Cardiologie',
  'Médecine Générale',
  'Pédiatrie',
  'Gynécologie',
  'Dermatologie',
  'Ophtalmologie',
  'Dentiste',
  'Neurologie',
  'ORL',
];

export default function DoctorProfileManagementScreen() {
  const { user, updateProfile } = useAuth();
  const doctor = user as DoctorProfile | null;

  const [fullName, setFullName] = useState(
    doctor?.fullName || 'Dr. Aïssatou Ndiaye'
  );
  const [specialty, setSpecialty] = useState(
    doctor?.specialty || 'Cardiologie'
  );
  const [subSpecialtiesText, setSubSpecialtiesText] = useState(
    doctor?.subSpecialties?.join(', ') ||
      'Échocardiographie, Hypertension artérielle, Cardiologie préventive'
  );
  const [licenseNumber] = useState(
    doctor?.licenseNumber || 'OM-SN-2012-0482'
  );
  const [facilityName, setFacilityName] = useState(
    doctor?.facilityName || 'Clinique du Cap'
  );
  const [facilityDistrict, setFacilityDistrict] = useState(
    doctor?.facilityDistrict || 'Plateau'
  );
  const [facilityAddress, setFacilityAddress] = useState(
    doctor?.facilityAddress || 'Avenue Pasteur, Dakar Plateau'
  );
  const [consultationFee, setConsultationFee] = useState(
    doctor?.consultationFeeFCFA ? String(doctor.consultationFeeFCFA) : '25000'
  );
  const [consultationTypes, setConsultationTypes] = useState<
    Array<'in_person' | 'teleconsultation'>
  >(doctor?.consultationTypes || ['in_person', 'teleconsultation']);
  const [professionalPhone, setProfessionalPhone] = useState(
    doctor?.professionalPhone || doctor?.phone || '+221 33 889 02 02'
  );
  const [publicEmail, setPublicEmail] = useState(
    doctor?.publicEmail || doctor?.email || 'contact.ndiaye@cliniqueducap.sn'
  );
  const [bio, setBio] = useState(
    doctor?.bio ||
      'Spécialiste en cardiologie clinique et préventive. Ancien interne des hôpitaux de Dakar (CHU Le Dantec) avec plus de 14 ans d’exercice.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (doctor && doctor.role === 'doctor') {
      setFullName(doctor.fullName || '');
      setSpecialty(doctor.specialty || 'Cardiologie');
      if (doctor.subSpecialties && doctor.subSpecialties.length > 0) {
        setSubSpecialtiesText(doctor.subSpecialties.join(', '));
      }
      setFacilityName(doctor.facilityName || '');
      setFacilityDistrict(doctor.facilityDistrict || '');
      setFacilityAddress(doctor.facilityAddress || '');
      setConsultationFee(String(doctor.consultationFeeFCFA || 25000));
      setConsultationTypes(
        doctor.consultationTypes && doctor.consultationTypes.length > 0
          ? doctor.consultationTypes
          : ['in_person']
      );
      setProfessionalPhone(doctor.professionalPhone || doctor.phone || '');
      setPublicEmail(doctor.publicEmail || doctor.email || '');
      if (doctor.bio) {
        setBio(doctor.bio);
      }
    }
  }, [doctor]);

  const isVerified = doctor?.verificationStatus === 'verified';

  const toggleConsultationType = (type: 'in_person' | 'teleconsultation') => {
    setConsultationTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) {
          Alert.alert(
            'Type de consultation requis',
            'Veuillez conserver au moins un mode de consultation actif.'
          );
          return prev;
        }
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const handleSave = async () => {
    setFormError(null);
    setSaveSuccess(null);

    if (!specialty.trim()) {
      setFormError('La spécialité médicale est obligatoire.');
      return;
    }

    if (!facilityName.trim() || !facilityAddress.trim() || !facilityDistrict.trim()) {
      setFormError(
        'L’établissement associé, le quartier et l’adresse du cabinet à Dakar sont obligatoires.'
      );
      return;
    }

    const numericFee = Number(consultationFee.replace(/[^0-9]/g, ''));
    if (!numericFee || numericFee < 1000) {
      setFormError(
        'Veuillez renseigner un tarif de consultation valide en FCFA (minimum 1 000 FCFA).'
      );
      return;
    }

    if (professionalPhone.trim() && !isValidSenegalPhone(professionalPhone.trim())) {
      setFormError(
        'Le numéro de téléphone professionnel doit être au format sénégalais (+221 33/77/78...).'
      );
      return;
    }

    if (publicEmail.trim() && !isValidEmail(publicEmail.trim())) {
      setFormError('Veuillez saisir une adresse email publique valide.');
      return;
    }

    const parsedSubSpecialties = subSpecialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      // SECURITY RULE: Only allowed fields are updated. Role and verification_status cannot be changed.
      const success = await updateProfile({
        fullName: fullName.trim(),
        specialty: specialty.trim(),
        subSpecialties: parsedSubSpecialties,
        facilityName: facilityName.trim(),
        facilityDistrict: facilityDistrict.trim(),
        facilityAddress: facilityAddress.trim(),
        consultationFeeFCFA: numericFee,
        consultationTypes,
        professionalPhone: professionalPhone.trim(),
        publicEmail: publicEmail.trim().toLowerCase(),
        bio: bio.trim(),
      });

      if (success) {
        setSaveSuccess(
          'Votre profil professionnel a été enregistré et synchronisé.'
        );
      } else {
        setFormError('Impossible de mettre à jour le profil professionnel.');
      }
    } catch (e: any) {
      setFormError(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper scrollable>
      <CustomHeader showBack title="Profil Professionnel" />

      <View style={styles.content}>
        {/* Verification Status Banner */}
        <Card
          padding="md"
          style={
            isVerified ? styles.verificationBanner : styles.pendingBanner
          }
        >
          <View style={styles.bannerRow}>
            <MaterialCommunityIcons
              name={isVerified ? 'shield-check' : 'shield-alert-outline'}
              size={26}
              color={isVerified ? Colors.primary : Colors.warning}
            />
            <View style={styles.bannerText}>
              <View style={styles.bannerTitleRow}>
                <Text style={styles.bannerTitle}>
                  {isVerified
                    ? 'Compte Médical Vérifié'
                    : 'Vérification Professionnelle En Attente'}
                </Text>
                <Badge
                  label={isVerified ? 'Public' : 'En attente'}
                  variant={isVerified ? 'verified' : 'pending'}
                  size="sm"
                />
              </View>
              <Text style={styles.bannerDesc}>
                {isVerified
                  ? `N° d'Ordre : ${licenseNumber}. Vos modifications sont immédiatement visibles sur votre fiche publique.`
                  : "Votre compte est en cours d'examen. Vos modifications sont enregistrées mais votre fiche ne sera visible dans la recherche publique qu'après validation."}
              </Text>
            </View>
          </View>
        </Card>

        {saveSuccess && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={Colors.success}
            />
            <Text style={styles.successText}>{saveSuccess}</Text>
          </View>
        )}

        {formError && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={Colors.error}
            />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        )}

        {/* Avatar Header */}
        <View style={styles.avatarHeader}>
          <Avatar
            name={fullName}
            uri={doctor?.avatarUrl}
            size="xl"
            verified={isVerified}
          />
          <Text style={styles.doctorHeaderName}>{fullName}</Text>
          <Text style={styles.doctorHeaderSub}>
            {specialty} • {formatFCFA(Number(consultationFee) || 0)}
          </Text>
        </View>

        {/* 1. Biography */}
        <Text style={styles.sectionTitle}>1. Biographie & Présentation</Text>
        <Card padding="md" style={styles.sectionCard}>
          <CustomInput
            label="Biographie médicale & Parcours académique"
            placeholder="Présentez votre parcours, vos diplômes (UCAD, internat...) et votre approche clinique..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            inputStyle={{ minHeight: 96, textAlignVertical: 'top' }}
          />
        </Card>

        {/* 2. Specialty Information */}
        <Text style={styles.sectionTitle}>
          2. Spécialité & Domaines d’expertise
        </Text>
        <Card padding="md" style={styles.sectionCard}>
          <Text style={styles.chipLabel}>Spécialité principale</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {MEDICAL_SPECIALTIES.map((spec) => {
              const selected = specialty === spec;
              return (
                <Pressable
                  key={spec}
                  onPress={() => setSpecialty(spec)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextActive,
                    ]}
                  >
                    {spec}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <CustomInput
            label="Spécialité affichée"
            value={specialty}
            onChangeText={setSpecialty}
            leftIcon="medical-bag"
          />

          <CustomInput
            label="Sous-spécialités & Actes médicaux (séparés par une virgule)"
            value={subSpecialtiesText}
            onChangeText={setSubSpecialtiesText}
            placeholder="Ex: Échocardiographie, Holter ECG, Hypertension"
            leftIcon="format-list-bulleted"
          />
        </Card>

        {/* 3. Consultation Price & 4. Consultation Types */}
        <Text style={styles.sectionTitle}>
          3. Tarif & Types de Consultation
        </Text>
        <Card padding="md" style={styles.sectionCard}>
          <CustomInput
            label="Prix de la consultation (FCFA)"
            value={consultationFee}
            onChangeText={setConsultationFee}
            keyboardType="numeric"
            hint={`Montant affiché aux patients : ${formatFCFA(Number(consultationFee) || 0)}`}
            leftIcon="cash-multiple"
          />

          <Text style={styles.chipLabel}>
            Modes de consultation proposés aux patients
          </Text>
          <View style={styles.consultTypesRow}>
            <Pressable
              onPress={() => toggleConsultationType('in_person')}
              style={[
                styles.consultTypeBox,
                consultationTypes.includes('in_person') &&
                  styles.consultTypeBoxActive,
              ]}
            >
              <MaterialCommunityIcons
                name="hospital-building"
                size={22}
                color={
                  consultationTypes.includes('in_person')
                    ? Colors.primary
                    : Colors.secondaryText
                }
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.consultTypeTitle,
                    consultationTypes.includes('in_person') &&
                      styles.consultTypeTitleActive,
                  ]}
                >
                  Au cabinet
                </Text>
                <Text style={styles.consultTypeSub}>Présentiel à Dakar</Text>
              </View>
              <MaterialCommunityIcons
                name={
                  consultationTypes.includes('in_person')
                    ? 'checkbox-marked-circle'
                    : 'checkbox-blank-circle-outline'
                }
                size={20}
                color={
                  consultationTypes.includes('in_person')
                    ? Colors.primary
                    : Colors.secondaryText
                }
              />
            </Pressable>

            <Pressable
              onPress={() => toggleConsultationType('teleconsultation')}
              style={[
                styles.consultTypeBox,
                consultationTypes.includes('teleconsultation') &&
                  styles.consultTypeBoxActive,
              ]}
            >
              <MaterialCommunityIcons
                name="video-outline"
                size={22}
                color={
                  consultationTypes.includes('teleconsultation')
                    ? Colors.primary
                    : Colors.secondaryText
                }
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.consultTypeTitle,
                    consultationTypes.includes('teleconsultation') &&
                      styles.consultTypeTitleActive,
                  ]}
                >
                  Téléconsultation
                </Text>
                <Text style={styles.consultTypeSub}>Vidéo à distance</Text>
              </View>
              <MaterialCommunityIcons
                name={
                  consultationTypes.includes('teleconsultation')
                    ? 'checkbox-marked-circle'
                    : 'checkbox-blank-circle-outline'
                }
                size={20}
                color={
                  consultationTypes.includes('teleconsultation')
                    ? Colors.primary
                    : Colors.secondaryText
                }
              />
            </Pressable>
          </View>
        </Card>

        {/* 5. Facility Association & Practice Address */}
        <Text style={styles.sectionTitle}>
          4. Établissement associé & Adresse à Dakar
        </Text>
        <Card padding="md" style={styles.sectionCard}>
          <Text style={styles.chipLabel}>
            Sélection rapide d’une structure partenaire à Dakar
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {DAKAR_PARTNER_FACILITIES.map((fac) => {
              const selected = facilityName === fac;
              return (
                <Pressable
                  key={fac}
                  onPress={() => setFacilityName(fac)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextActive,
                    ]}
                  >
                    {fac}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <CustomInput
            label="Nom de la clinique, hôpital ou cabinet"
            value={facilityName}
            onChangeText={setFacilityName}
            leftIcon="hospital-building"
          />

          <CustomInput
            label="Quartier à Dakar"
            value={facilityDistrict}
            onChangeText={setFacilityDistrict}
            placeholder="Ex: Plateau, Almadies, Mermoz, Point E..."
            leftIcon="map-marker-radius-outline"
          />

          <CustomInput
            label="Adresse complète d’exercice"
            value={facilityAddress}
            onChangeText={setFacilityAddress}
            placeholder="Ex: Avenue Pasteur, Dakar Plateau"
            leftIcon="map-marker-outline"
          />
        </Card>

        {/* 6. Public Contact Details */}
        <Text style={styles.sectionTitle}>
          5. Coordonnées de Contact Public
        </Text>
        <Card padding="md" style={styles.sectionCard}>
          <CustomInput
            label="Téléphone professionnel du secrétariat (+221)"
            value={professionalPhone}
            onChangeText={setProfessionalPhone}
            keyboardType="phone-pad"
            placeholder="+221 33 889 02 02"
            leftIcon="phone-classic"
          />

          <CustomInput
            label="Email professionnel public"
            value={publicEmail}
            onChangeText={setPublicEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="contact@clinique.sn"
            leftIcon="email-check-outline"
          />
        </Card>

        {/* Locked Security Fields */}
        <Text style={styles.sectionTitle}>
          Informations Réglementaires (Verrouillées)
        </Text>
        <Card padding="md" style={styles.sectionCard}>
          <CustomInput
            label="Numéro d’Ordre des Médecins du Sénégal"
            value={licenseNumber}
            editable={false}
            leftIcon="badge-account-outline"
          />
          <CustomInput
            label="Rôle du compte"
            value="DOCTEUR (Non modifiable)"
            editable={false}
            leftIcon="shield-lock-outline"
          />
        </Card>

        <PrimaryButton
          title="Enregistrer mon profil professionnel"
          loading={isSaving}
          onPress={handleSave}
          icon="content-save-check-outline"
          size="lg"
          fullWidth
          style={styles.saveBtn}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  verificationBanner: {
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.25)',
    marginBottom: Spacing.md,
  },
  pendingBanner: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.35)',
    marginBottom: Spacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  bannerDesc: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.text,
    lineHeight: 16,
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
  successText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.success,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.error,
    flex: 1,
  },
  avatarHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  doctorHeaderName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  doctorHeaderSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semiBold,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  chipLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  chipsRow: {
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  consultTypesRow: {
    gap: Spacing.sm,
    marginTop: 4,
  },
  consultTypeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  consultTypeBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  consultTypeTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  consultTypeTitleActive: {
    color: Colors.primaryDark,
  },
  consultTypeSub: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
  },
  saveBtn: {
    marginTop: Spacing.md,
  },
});
