import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { DoctorCard } from '@/components/doctors/DoctorCard';
import { FacilityCard } from '@/components/common/FacilityCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useAuth } from '@/context/AuthContext';
import { doctorService } from '@/services/doctorService';
import { favoriteService } from '@/services/favoriteService';
import { DoctorListItem, FacilityItem } from '@/types/doctor';

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<'doctors' | 'facilities'>('doctors');
  const [favoriteDoctors, setFavoriteDoctors] = useState<DoctorListItem[]>([]);
  const [favoriteFacilities, setFavoriteFacilities] = useState<FacilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const patientId = user?.id || 'pat_pre_1';

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const [savedDocs, facilities, favFacIds] = await Promise.all([
        favoriteService.getSavedFavoriteDoctors(patientId),
        doctorService.getFacilities(),
        doctorService.getFavoriteFacilityIds(patientId),
      ]);

      setFavoriteDoctors(savedDocs);
      setFavoriteFacilities(
        facilities.filter((fac) => favFacIds.includes(fac.id))
      );
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const handleToggleFavoriteDoctor = async (doctorId: string) => {
    await favoriteService.removeFavoriteDoctor(patientId, doctorId);
    await loadFavorites();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingIndicator fullScreen message="Chargement de vos favoris..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Favoris</Text>
        <Text style={styles.subtitle}>
          Vos praticiens et centres médicaux enregistrés à Dakar
        </Text>

        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setFilterType('doctors')}
            style={[
              styles.toggleBtn,
              filterType === 'doctors' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                filterType === 'doctors' && styles.toggleTextActive,
              ]}
            >
              Médecins ({favoriteDoctors.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterType('facilities')}
            style={[
              styles.toggleBtn,
              filterType === 'facilities' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                filterType === 'facilities' && styles.toggleTextActive,
              ]}
            >
              Établissements ({favoriteFacilities.length})
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filterType === 'doctors' ? (
          favoriteDoctors.length > 0 ? (
            favoriteDoctors.map((doc) => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                onPress={() => router.push(`/doctor/${doc.id}`)}
                onFavoriteToggle={() => handleToggleFavoriteDoctor(doc.id)}
              />
            ))
          ) : (
            <EmptyState
              title="Aucun praticien favori"
              description="Ajoutez des médecins à vos favoris en appuyant sur l'icône cœur de leur profil pour les retrouver facilement."
              actionTitle="Trouver un médecin"
              onActionPress={() => router.push('/(tabs)/search')}
            />
          )
        ) : favoriteFacilities.length > 0 ? (
          favoriteFacilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              onPress={() => router.push(`/facility/${facility.id}`)}
            />
          ))
        ) : (
          <EmptyState
            title="Aucun établissement enregistré"
            description="Enregistrez vos cliniques et hôpitaux de référence à Dakar."
            actionTitle="Découvrir les structures"
            onActionPress={() => router.push('/(tabs)/search')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 3,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.white,
  },
  toggleText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
});
