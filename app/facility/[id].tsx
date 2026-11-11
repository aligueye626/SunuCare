import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { DoctorCard } from '@/components/doctors/DoctorCard';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { doctorService } from '@/services/doctorService';
import { DoctorListItem, FacilityItem } from '@/types/doctor';
import { FacilityType } from '@/types/facility';

function getFacilityTypeLabel(type: FacilityType): string {
  switch (type) {
    case 'clinique':
      return 'Clinique Privée';
    case 'hopital':
      return 'Centre Hospitalier';
    case 'centre_medical':
      return 'Centre Médical';
    case 'laboratoire':
      return 'Laboratoire d’Analyses';
    default:
      return 'Établissement de Santé';
  }
}

export default function FacilityProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const patientId = user?.id || 'pat_pre_1';

  const [facility, setFacility] = useState<FacilityItem | null>(null);
  const [associatedDoctors, setAssociatedDoctors] = useState<DoctorListItem[]>(
    []
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFacilityProfile = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const fac = await doctorService.getFacilityById(id);
      if (!fac) {
        setError('Cet établissement de santé est introuvable.');
        setIsLoading(false);
        return;
      }

      const [doctors, favFacIds, favDocIds] = await Promise.all([
        doctorService.getDoctorsByFacility(fac),
        doctorService.getFavoriteFacilityIds(patientId),
        doctorService.getFavoriteDoctorIds(patientId),
      ]);

      setFacility(fac);
      setIsFavorite(favFacIds.includes(fac.id));
      setAssociatedDoctors(
        doctors.map((d) => ({
          ...d,
          isFavorite: favDocIds.includes(d.id),
        }))
      );
    } catch (e: any) {
      setError(
        e.message || 'Impossible de charger la fiche de cet établissement.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, patientId]);

  useEffect(() => {
    loadFacilityProfile();
  }, [loadFacilityProfile]);

  const handleToggleFavoriteFacility = async () => {
    if (!facility) return;
    const nextIds = await doctorService.toggleFavoriteFacility(
      patientId,
      facility.id
    );
    setIsFavorite(nextIds.includes(facility.id));
  };

  const handleToggleFavoriteDoctor = async (doctorId: string) => {
    const nextIds = await doctorService.toggleFavoriteDoctor(
      patientId,
      doctorId
    );
    setAssociatedDoctors((prev) =>
      prev.map((d) => ({
        ...d,
        isFavorite: nextIds.includes(d.id),
      }))
    );
  };

  const handleOpenDirections = async () => {
    if (!facility) return;
    const queryAddress = encodeURIComponent(
      `${facility.name}, ${facility.address}, ${facility.district}, ${facility.city || 'Dakar'}, Sénégal`
    );

    const url =
      facility.latitude && facility.longitude
        ? Platform.select({
            ios: `maps:0,0?q=${queryAddress}@${facility.latitude},${facility.longitude}`,
            android: `geo:${facility.latitude},${facility.longitude}?q=${queryAddress}`,
            default: `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`,
          })
        : `https://www.google.com/maps/search/?api=1&query=${queryAddress}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${queryAddress}`
        );
      }
    } catch {
      Alert.alert(
        'Itinéraire GPS',
        `Adresse : ${facility.address}, Quartier ${facility.district}, ${facility.city || 'Dakar'}`
      );
    }
  };

  const handleCallFacility = async () => {
    if (!facility?.phone) return;
    const cleanPhone = facility.phone.replace(/\s+/g, '');
    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch {
      Alert.alert('Standard téléphonique', `Numéro : ${facility.phone}`);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Fiche Établissement" />
        <LoadingIndicator
          fullScreen
          message="Chargement de l’établissement de santé..."
        />
      </ScreenWrapper>
    );
  }

  if (error || !facility) {
    return (
      <ScreenWrapper>
        <CustomHeader showBack title="Fiche Établissement" />
        <ErrorState
          title="Établissement non trouvé"
          message={error || 'Impossible d’afficher cet établissement.'}
          onRetry={loadFacilityProfile}
        />
      </ScreenWrapper>
    );
  }

  const servicesList =
    facility.availableServices && facility.availableServices.length > 0
      ? facility.availableServices
      : [
          'Consultations médicales sur rendez-vous',
          'Accueil et orientation des patients',
          'Suivi médical spécialisé',
        ];

  return (
    <ScreenWrapper>
      <CustomHeader
        showBack
        title="Établissement de Santé"
        rightAction={
          <Pressable
            onPress={handleToggleFavoriteFacility}
            hitSlop={10}
            style={styles.favBtn}
          >
            <MaterialCommunityIcons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? Colors.error : Colors.secondaryText}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card: Facility Name, Type, Badges, Rating */}
        <Card padding="lg" style={styles.headerCard}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={
                facility.type === 'hopital'
                  ? 'hospital-building'
                  : 'hospital-marker'
              }
              size={36}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.facilityName}>{facility.name}</Text>
          <Text style={styles.facilityType}>
            {getFacilityTypeLabel(facility.type)} • {facility.district},{' '}
            {facility.city || 'Dakar'}
          </Text>

          <View style={styles.badgeRow}>
            <Badge
              label={getFacilityTypeLabel(facility.type)}
              variant="primary"
              size="sm"
            />
            {facility.isOpen24h && (
              <Badge label="Ouvert 24h/24" variant="verified" size="sm" />
            )}
            {facility.emergencyAvailable && (
              <Badge label="Urgences Médicales" variant="warning" size="sm" />
            )}
          </View>

          {facility.description && (
            <Text style={styles.descriptionText}>{facility.description}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.ratingInline}>
                <MaterialCommunityIcons
                  name="star"
                  size={16}
                  color={Colors.accentGold}
                />
                <Text style={styles.statValue}>
                  {facility.rating.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.statLabel}>
                {facility.reviewCount} avis patients
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{associatedDoctors.length}</Text>
              <Text style={styles.statLabel}>Praticiens vérifiés</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {facility.availableSpecialties.length}
              </Text>
              <Text style={styles.statLabel}>Spécialités</Text>
            </View>
          </View>
        </Card>

        {/* Address, Neighborhood, City, Phone & External Map Directions */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>
            Localisation & Coordonnées à Dakar
          </Text>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={20}
              color={Colors.primary}
            />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Adresse complète</Text>
              <Text style={styles.infoValue}>{facility.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="city-variant-outline"
              size={20}
              color={Colors.primary}
            />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Quartier & Ville</Text>
              <Text style={styles.infoValue}>
                Quartier {facility.district}, {facility.city || 'Dakar'},
                Sénégal
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="phone-classic"
              size={20}
              color={Colors.primary}
            />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Standard téléphonique</Text>
              <Text style={styles.infoValue}>{facility.phone}</Text>
            </View>
          </View>

          {facility.email && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={Colors.primary}
              />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Contact email</Text>
                <Text style={styles.infoValue}>{facility.email}</Text>
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <SecondaryButton
              title="Appeler"
              onPress={handleCallFacility}
              size="sm"
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title="Itinéraire GPS (Carte)"
              icon="map-marker-path"
              onPress={handleOpenDirections}
              size="sm"
              style={{ flex: 1.4 }}
            />
          </View>
        </Card>

        {/* Available Services & Medical Specialties */}
        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>
            Services médicaux & Pôles disponibles
          </Text>

          <View style={styles.specialtyChipRow}>
            {facility.availableSpecialties.map((spec) => (
              <Pressable
                key={spec}
                onPress={() =>
                  router.push({
                    pathname: '/search-results',
                    params: { specialty: spec, district: facility.district },
                  })
                }
                style={styles.specialtyChip}
              >
                <MaterialCommunityIcons
                  name="medical-bag"
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.specialtyChipText}>{spec}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.servicesList}>
            {servicesList.map((srv) => (
              <View key={srv} style={styles.serviceItem}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.serviceItemText}>{srv}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Associated Doctors */}
        <Text style={styles.doctorsHeaderTitle}>
          Praticiens vérifiés exerçant à {facility.name} (
          {associatedDoctors.length})
        </Text>

        {associatedDoctors.length > 0 ? (
          associatedDoctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              onPress={() => router.push(`/doctor/${doc.id}`)}
              onFavoriteToggle={() => handleToggleFavoriteDoctor(doc.id)}
            />
          ))
        ) : (
          <Card padding="md" style={styles.card}>
            <Text style={styles.emptyDoctorsText}>
              Aucun médecin supplémentaire listé individuellement pour le moment. Contactez le standard au {facility.phone} pour les consultations externes.
            </Text>
          </Card>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  favBtn: {
    padding: Spacing.xs,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  facilityName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  facilityType: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semiBold,
    marginTop: 4,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  statBox: {
    alignItems: 'center',
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.borderLight,
  },
  card: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  specialtyChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    gap: 5,
  },
  specialtyChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primaryDark,
  },
  servicesList: {
    gap: Spacing.xs + 2,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  serviceItemText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.text,
    flex: 1,
  },
  doctorsHeaderTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  emptyDoctorsText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    lineHeight: 18,
  },
});

