import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';
import { SearchBar } from '@/components/search/SearchBar';
import { DoctorCard } from '@/components/doctors/DoctorCard';
import { FacilityCard } from '@/components/common/FacilityCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Badge } from '@/components/common/Badge';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SecondaryButton } from '@/components/common/SecondaryButton';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { doctorService } from '@/services/doctorService';
import {
  DAKAR_NEIGHBORHOODS,
  DoctorListItem,
  FacilityItem,
  SearchSuggestionItem,
} from '@/types/doctor';
import { ConsultationType } from '@/types/appointment';
import { formatFCFA } from '@/utils/formatters';

const DAKAR_DISTRICT_FILTERS = ['Tous', ...DAKAR_NEIGHBORHOODS];

const SPECIALTY_FILTERS = [
  'Tous',
  'Médecine Générale',
  'Cardiologie',
  'Pédiatrie',
  'Gynécologie & Obstétrique',
  'Dermatologie',
  'Ophtalmologie',
  'Dentisterie',
  'ORL',
  'Orthopédie',
  'Neurologie',
];

const PRICE_RANGE_OPTIONS = [
  { label: 'Tous tarifs', max: undefined },
  { label: '≤ 15 000 FCFA', max: 15000 },
  { label: '≤ 20 000 FCFA', max: 20000 },
  { label: '≤ 25 000 FCFA', max: 25000 },
  { label: '≤ 30 000 FCFA', max: 30000 },
];

const AVAILABILITY_OPTIONS = [
  { label: 'Toute date', value: 'any' },
  { label: "Aujourd'hui", value: 'today' },
  { label: 'Demain', value: 'tomorrow' },
  { label: 'Cette semaine', value: 'this_week' },
];

const QUICK_SYNONYM_CHIPS = [
  { label: 'Cœur (Cardio)', query: 'coeur' },
  { label: 'Peau (Dermato)', query: 'peau' },
  { label: 'Dents (Dentiste)', query: 'dents' },
  { label: 'Enfants (Pédiatre)', query: 'enfants' },
  { label: 'Yeux (Ophtalmo)', query: 'yeux' },
];

const PAGE_SIZE = 5;

export default function PatientSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    specialty?: string;
    query?: string;
    district?: string;
  }>();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 280);

  const [selectedDistrict, setSelectedDistrict] = useState('Tous');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Tous');
  const [consultationType, setConsultationType] = useState<
    'all' | ConsultationType
  >('all');
  const [availableDate, setAvailableDate] = useState<string>('any');
  const [maxPriceFCFA, setMaxPriceFCFA] = useState<number | undefined>(
    undefined
  );
  const [sortBy, setSortBy] = useState<
    'relevance' | 'rating' | 'price_asc' | 'availability'
  >('relevance');

  const [activeTab, setActiveTab] = useState<'doctors' | 'facilities'>(
    'doctors'
  );
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Results & Pagination state
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [totalDoctorCount, setTotalDoctorCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [resolvedSpecialtyHint, setResolvedSpecialtyHint] = useState<
    string | undefined
  >(undefined);
  const [resolvedDistrictHint, setResolvedDistrictHint] = useState<
    string | undefined
  >(undefined);

  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const patientId = user?.id || 'pat_pre_1';

  useEffect(() => {
    if (params.specialty) {
      setSelectedSpecialty(params.specialty);
      setActiveTab('doctors');
    }
    if (params.query) {
      setQuery(params.query);
    }
    if (params.district) {
      setSelectedDistrict(params.district);
    }
  }, [params.specialty, params.query, params.district]);

  // Execute intelligent debounced search with pagination
  const executeSearch = useCallback(
    async (targetPage = 1, append = false) => {
      if (targetPage === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const [doctorSearchResult, favDocIds, matchedFacilities, sugList] =
          await Promise.all([
            doctorService.searchDoctors({
              query: debouncedQuery,
              specialty: selectedSpecialty,
              district: selectedDistrict,
              consultationType,
              availableDate,
              maxPriceFCFA,
              sortBy,
              page: targetPage,
              pageSize: PAGE_SIZE,
            }),
            doctorService.getFavoriteDoctorIds(patientId),
            doctorService.getFacilities({
              query: debouncedQuery,
              district: selectedDistrict,
            }),
            debouncedQuery.trim().length >= 2
              ? doctorService.getSearchSuggestions(debouncedQuery, 5)
              : Promise.resolve([]),
          ]);

        const enrichedItems = doctorSearchResult.items.map((d) => ({
          ...d,
          isFavorite: favDocIds.includes(d.id),
        }));

        if (append) {
          setDoctors((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            return [
              ...prev,
              ...enrichedItems.filter((item) => !existingIds.has(item.id)),
            ];
          });
        } else {
          setDoctors(enrichedItems);
        }

        setTotalDoctorCount(doctorSearchResult.totalCount);
        setPage(doctorSearchResult.page);
        setHasMore(doctorSearchResult.hasMore);
        setResolvedSpecialtyHint(doctorSearchResult.resolvedSpecialty);
        setResolvedDistrictHint(doctorSearchResult.resolvedDistrict);
        setFacilities(matchedFacilities);
        setSuggestions(sugList);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [
      debouncedQuery,
      selectedSpecialty,
      selectedDistrict,
      consultationType,
      availableDate,
      maxPriceFCFA,
      sortBy,
      patientId,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      executeSearch(1, false);
    }, [executeSearch])
  );

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    executeSearch(page + 1, true);
  };

  const handleToggleFavorite = async (doctorId: string) => {
    const nextFavIds = await doctorService.toggleFavoriteDoctor(
      patientId,
      doctorId
    );
    setDoctors((prev) =>
      prev.map((d) => ({
        ...d,
        isFavorite: nextFavIds.includes(d.id),
      }))
    );
  };

  const handleSelectSuggestion = (sug: SearchSuggestionItem) => {
    setShowSuggestions(false);
    if (sug.type === 'doctor' && sug.entityId) {
      router.push(`/doctor/${sug.entityId}`);
      return;
    }
    if (sug.type === 'facility' && sug.entityId) {
      router.push(`/facility/${sug.entityId}`);
      return;
    }
    if (sug.targetFilter?.specialty) {
      setSelectedSpecialty(sug.targetFilter.specialty);
      setQuery('');
      return;
    }
    if (sug.targetFilter?.district) {
      setSelectedDistrict(sug.targetFilter.district);
      setQuery('');
      return;
    }
    setQuery(sug.queryValue);
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedDistrict('Tous');
    setSelectedSpecialty('Tous');
    setConsultationType('all');
    setAvailableDate('any');
    setMaxPriceFCFA(undefined);
    setSortBy('relevance');
  };

  const activeFiltersCount = [
    selectedSpecialty !== 'Tous',
    selectedDistrict !== 'Tous',
    consultationType !== 'all',
    availableDate !== 'any',
    maxPriceFCFA !== undefined,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Recherche Médicale Dakar</Text>
            <Text style={styles.subtitle}>
              Praticiens vérifiés, spécialités, symptômes et cliniques
            </Text>
          </View>
          {activeFiltersCount > 0 && (
            <Pressable onPress={handleResetFilters} style={styles.resetPill}>
              <MaterialCommunityIcons
                name="filter-remove-outline"
                size={15}
                color={Colors.error}
              />
              <Text style={styles.resetPillText}>
                Réinitialiser ({activeFiltersCount})
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowSuggestions(text.trim().length >= 2);
            }}
            placeholder="Nom, spécialité, symptôme (ex: coeur, peau, dents)..."
            onFilterPress={() => setIsFilterModalVisible(true)}
          />
        </View>

        {/* Intelligent Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.map((sug) => (
              <Pressable
                key={sug.id}
                onPress={() => handleSelectSuggestion(sug)}
                style={styles.suggestionRow}
              >
                <MaterialCommunityIcons
                  name={
                    sug.type === 'synonym' || sug.type === 'specialty'
                      ? 'stethoscope'
                      : sug.type === 'neighborhood'
                        ? 'map-marker-radius'
                        : sug.type === 'facility'
                          ? 'hospital-building'
                          : 'doctor'
                  }
                  size={18}
                  color={Colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionLabel}>{sug.label}</Text>
                  <Text style={styles.suggestionSub}>{sug.subtitle}</Text>
                </View>
                <MaterialCommunityIcons
                  name="arrow-top-left"
                  size={16}
                  color={Colors.secondaryText}
                />
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick Symptom / Synonym Chips when query is empty */}
        {!query && selectedSpecialty === 'Tous' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.synonymChipsRow}
          >
            {QUICK_SYNONYM_CHIPS.map((item) => (
              <Pressable
                key={item.query}
                onPress={() => {
                  setQuery(item.query);
                  setShowSuggestions(false);
                }}
                style={styles.synonymChip}
              >
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={13}
                  color={Colors.primary}
                />
                <Text style={styles.synonymChipText}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* 12 Dakar Neighborhood Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.districtChips}
        >
          {DAKAR_DISTRICT_FILTERS.map((dist) => (
            <Pressable
              key={dist}
              onPress={() => setSelectedDistrict(dist)}
              style={[
                styles.chip,
                selectedDistrict === dist && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedDistrict === dist && styles.chipTextActive,
                ]}
              >
                {dist}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Active Synonym / Filter Resolution Banner */}
        {(resolvedSpecialtyHint ||
          resolvedDistrictHint ||
          selectedSpecialty !== 'Tous' ||
          consultationType !== 'all' ||
          availableDate !== 'any' ||
          maxPriceFCFA !== undefined) && (
          <View style={styles.activeFilterSummary}>
            {resolvedSpecialtyHint && (
              <Badge
                label={`Synonyme détecté : ${resolvedSpecialtyHint}`}
                variant="verified"
                size="sm"
              />
            )}
            {resolvedDistrictHint && (
              <Badge
                label={`Quartier : ${resolvedDistrictHint}`}
                variant="secondary"
                size="sm"
              />
            )}
            {selectedSpecialty !== 'Tous' && (
              <Badge
                label={selectedSpecialty}
                variant="primary"
                size="sm"
              />
            )}
            {consultationType !== 'all' && (
              <Badge
                label={
                  consultationType === 'teleconsultation'
                    ? 'Téléconsultation'
                    : 'Au cabinet'
                }
                variant="secondary"
                size="sm"
              />
            )}
            {availableDate !== 'any' && (
              <Badge
                label={
                  availableDate === 'today'
                    ? "Dispo Aujourd'hui"
                    : availableDate === 'tomorrow'
                      ? 'Dispo Demain'
                      : 'Dispo cette semaine'
                }
                variant="success"
                size="sm"
              />
            )}
            {maxPriceFCFA !== undefined && (
              <Badge
                label={`Max ${formatFCFA(maxPriceFCFA)}`}
                variant="gold"
                size="sm"
              />
            )}
          </View>
        )}

        {/* Tab Toggle: Médecins vs Établissements */}
        <View style={styles.tabToggle}>
          <Pressable
            onPress={() => setActiveTab('doctors')}
            style={[
              styles.toggleBtn,
              activeTab === 'doctors' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                activeTab === 'doctors' && styles.toggleTextActive,
              ]}
            >
              Médecins vérifiés ({totalDoctorCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('facilities')}
            style={[
              styles.toggleBtn,
              activeTab === 'facilities' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                activeTab === 'facilities' && styles.toggleTextActive,
              ]}
            >
              Établissements ({facilities.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Results Content */}
      {isLoading ? (
        <LoadingIndicator
          fullScreen
          message="Recherche intelligente des praticiens à Dakar..."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'doctors' ? (
            doctors.length > 0 ? (
              <>
                {doctors.map((doc) => (
                  <DoctorCard
                    key={doc.id}
                    doctor={doc}
                    onPress={() => router.push(`/doctor/${doc.id}`)}
                    onFavoriteToggle={() => handleToggleFavorite(doc.id)}
                  />
                ))}

                {/* Pagination Controls */}
                <View style={styles.paginationFooter}>
                  <Text style={styles.paginationInfoText}>
                    Affichage de {doctors.length} sur {totalDoctorCount}{' '}
                    praticien{totalDoctorCount > 1 ? 's' : ''} vérifié
                    {totalDoctorCount > 1 ? 's' : ''}
                  </Text>
                  {hasMore && (
                    <SecondaryButton
                      title="Afficher plus de médecins"
                      loading={isLoadingMore}
                      onPress={handleLoadMore}
                      size="sm"
                      fullWidth
                    />
                  )}
                </View>
              </>
            ) : (
              <EmptyState
                title="Aucun praticien trouvé"
                description={`Aucun médecin vérifié ne correspond à vos critères actuels à Dakar. Essayez un autre terme (ex: "coeur", "peau", "dents") ou élargissez vos filtres.`}
                actionTitle="Réinitialiser tous les filtres"
                onActionPress={handleResetFilters}
              />
            )
          ) : facilities.length > 0 ? (
            facilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onPress={() => router.push(`/facility/${facility.id}`)}
              />
            ))
          ) : (
            <EmptyState
              title="Aucun établissement trouvé"
              description="Essayez d'élargir votre zone géographique à Dakar ou de modifier vos filtres."
              actionTitle="Réinitialiser les filtres"
              onActionPress={handleResetFilters}
            />
          )}
        </ScrollView>
      )}

      {/* Combined Filters Modal (Specialty, Consultation Type, Available Date, Price Range, Sort) */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres avancés (Dakar)</Text>
              <Pressable
                onPress={() => setIsFilterModalVisible(false)}
                hitSlop={10}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={Colors.text}
                />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 1. Specialty Filter */}
              <Text style={styles.filterGroupLabel}>Spécialité médicale</Text>
              <View style={styles.filterChipsWrap}>
                {SPECIALTY_FILTERS.map((spec) => {
                  const active = selectedSpecialty === spec;
                  return (
                    <Pressable
                      key={spec}
                      onPress={() => setSelectedSpecialty(spec)}
                      style={[
                        styles.modalChip,
                        active && styles.modalChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          active && styles.modalChipTextActive,
                        ]}
                      >
                        {spec}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 2. Consultation Type Filter */}
              <Text style={styles.filterGroupLabel}>Type de consultation</Text>
              <View style={styles.filterChipsWrap}>
                {[
                  { label: 'Tous les modes', value: 'all' as const },
                  { label: 'Au cabinet (Dakar)', value: 'in_person' as const },
                  {
                    label: 'Téléconsultation vidéo',
                    value: 'teleconsultation' as const,
                  },
                ].map((opt) => {
                  const active = consultationType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setConsultationType(opt.value)}
                      style={[
                        styles.modalChip,
                        active && styles.modalChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          active && styles.modalChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 3. Availability Date Filter */}
              <Text style={styles.filterGroupLabel}>
                Disponibilité de rendez-vous
              </Text>
              <View style={styles.filterChipsWrap}>
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const active = availableDate === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setAvailableDate(opt.value)}
                      style={[
                        styles.modalChip,
                        active && styles.modalChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          active && styles.modalChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 4. Price Range Filter (FCFA) */}
              <Text style={styles.filterGroupLabel}>
                Budget / Tarif maximum (FCFA)
              </Text>
              <View style={styles.filterChipsWrap}>
                {PRICE_RANGE_OPTIONS.map((opt) => {
                  const active = maxPriceFCFA === opt.max;
                  return (
                    <Pressable
                      key={opt.label}
                      onPress={() => setMaxPriceFCFA(opt.max)}
                      style={[
                        styles.modalChip,
                        active && styles.modalChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          active && styles.modalChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 5. Relevance & Sorting */}
              <Text style={styles.filterGroupLabel}>Tri des résultats</Text>
              <View style={styles.filterChipsWrap}>
                {[
                  { label: 'Pertinence', value: 'relevance' as const },
                  { label: 'Mieux notés', value: 'rating' as const },
                  { label: 'Tarif croissant', value: 'price_asc' as const },
                  {
                    label: 'Disponibilité immédiate',
                    value: 'availability' as const,
                  },
                ].map((opt) => {
                  const active = sortBy === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSortBy(opt.value)}
                      style={[
                        styles.modalChip,
                        active && styles.modalChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          active && styles.modalChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Réinitialiser"
                onPress={handleResetFilters}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title={`Voir les résultats (${totalDoctorCount})`}
                onPress={() => setIsFilterModalVisible(false)}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  resetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
    gap: 4,
  },
  resetPillText: {
    fontSize: Typography.fontSize.xs - 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.error,
  },
  searchBarWrapper: {
    marginBottom: Spacing.xs,
  },
  suggestionsBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  suggestionLabel: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  suggestionSub: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.secondaryText,
  },
  synonymChipsRow: {
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  synonymChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.secondaryLight,
  },
  synonymChipText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semiBold,
  },
  districtChips: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
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
  activeFilterSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: Spacing.xs,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.sm,
    marginTop: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
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
  resultsContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  paginationFooter: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  paginationInfoText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  filterGroupLabel: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  modalChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  modalChipTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
