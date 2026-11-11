import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { SearchBar } from '@/components/search/SearchBar';
import { DoctorCard } from '@/components/doctors/DoctorCard';
import { EmptyState } from '@/components/common/EmptyState';
import { doctorService } from '@/services/doctorService';
import { useDebounce } from '@/hooks/useDebounce';
import {
  ConsultationTypeFilter,
  DoctorListItem,
  DoctorSearchSortBy,
} from '@/types/doctor';
import { formatFCFA } from '@/utils/formatters';

const PAGE_SIZE = 6;

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    query?: string;
    specialty?: string;
    district?: string;
    consultationType?: ConsultationTypeFilter;
    availableDate?: string;
    maxPrice?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const debouncedQuery = useDebounce(searchQuery, 280);

  const [selectedSpecialty, setSelectedSpecialty] = useState(
    params.specialty || 'Toutes'
  );
  const [selectedDistrict, setSelectedDistrict] = useState(
    params.district || 'Tous'
  );
  const [consultationType, setConsultationType] =
    useState<ConsultationTypeFilter>(params.consultationType || 'all');
  const [availableDate, setAvailableDate] = useState(
    params.availableDate || ''
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(
    params.maxPrice ? Number(params.maxPrice) : undefined
  );

  const [sortBy, setSortBy] = useState<DoctorSearchSortBy>('relevance');

  const [results, setResults] = useState<DoctorListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [matchedSynonyms, setMatchedSynonyms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const executeSearch = useCallback(
    async (pageToFetch: number, append: boolean) => {
      if (pageToFetch === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await doctorService.searchDoctors({
          query: debouncedQuery,
          specialty: selectedSpecialty === 'Toutes' ? 'Tous' : selectedSpecialty,
          district: selectedDistrict,
          consultationType,
          availableDate: availableDate || undefined,
          maxPriceFCFA: maxPrice,
          sortBy,
          page: pageToFetch,
          pageSize: PAGE_SIZE,
        });

        setResults((prev) => (append ? [...prev, ...res.items] : res.items));
        setTotalCount(res.totalCount);
        setCurrentPage(res.page);
        setHasMore(res.hasMore);
        const resolvedList: string[] = [];
        if (res.resolvedSpecialty) resolvedList.push(res.resolvedSpecialty);
        if (res.resolvedDistrict) resolvedList.push(res.resolvedDistrict);
        setMatchedSynonyms(resolvedList);
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
      maxPrice,
      sortBy,
    ]
  );

  useEffect(() => {
    executeSearch(1, false);
  }, [executeSearch]);

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    executeSearch(currentPage + 1, true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('Toutes');
    setSelectedDistrict('Tous');
    setConsultationType('all');
    setAvailableDate('');
    setMaxPrice(undefined);
    setSortBy('relevance');
  };

  return (
    <ScreenWrapper>
      <CustomHeader showBack title="Résultats de recherche" />

      {/* Search & Filter Summary Bar */}
      <View style={styles.filterSummaryBar}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Affiner par nom, spécialité, clinique ou quartier..."
        />

        {/* Active filter pills */}
        <View style={styles.activePillsRow}>
          {selectedSpecialty !== 'Toutes' && (
            <Pressable
              onPress={() => setSelectedSpecialty('Toutes')}
              style={styles.activePill}
            >
              <Text style={styles.activePillText}>{selectedSpecialty}</Text>
              <MaterialCommunityIcons
                name="close-circle"
                size={14}
                color={Colors.primary}
              />
            </Pressable>
          )}
          {selectedDistrict !== 'Tous' && (
            <Pressable
              onPress={() => setSelectedDistrict('Tous')}
              style={styles.activePill}
            >
              <Text style={styles.activePillText}>
                Quartier : {selectedDistrict}
              </Text>
              <MaterialCommunityIcons
                name="close-circle"
                size={14}
                color={Colors.primary}
              />
            </Pressable>
          )}
          {consultationType !== 'all' && (
            <Pressable
              onPress={() => setConsultationType('all')}
              style={styles.activePill}
            >
              <Text style={styles.activePillText}>
                {consultationType === 'in_person'
                  ? 'Au cabinet'
                  : 'Téléconsultation'}
              </Text>
              <MaterialCommunityIcons
                name="close-circle"
                size={14}
                color={Colors.primary}
              />
            </Pressable>
          )}
          {maxPrice && (
            <Pressable
              onPress={() => setMaxPrice(undefined)}
              style={styles.activePill}
            >
              <Text style={styles.activePillText}>
                Max {formatFCFA(maxPrice)}
              </Text>
              <MaterialCommunityIcons
                name="close-circle"
                size={14}
                color={Colors.primary}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.queryRow}>
          <Text style={styles.resultsCount}>
            {totalCount} médecin{totalCount > 1 ? 's' : ''} vérifié
            {totalCount > 1 ? 's' : ''}
          </Text>
          {debouncedQuery ? (
            <Text style={styles.queryLabel} numberOfLines={1}>
              pour « {debouncedQuery} »
            </Text>
          ) : null}
        </View>

        {matchedSynonyms.length > 0 && (
          <View style={styles.synonymBanner}>
            <MaterialCommunityIcons
              name="auto-fix"
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.synonymBannerText}>
              Terme médical associé :{' '}
              <Text style={{ fontWeight: '700' }}>
                {matchedSynonyms.join(', ')}
              </Text>
            </Text>
          </View>
        )}

        {/* Sort Options */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}
        >
          <Text style={styles.sortLabel}>Trier par :</Text>
          {(
            [
              { key: 'relevance', label: 'Pertinence' },
              { key: 'rating', label: 'Mieux notés' },
              { key: 'price_asc', label: 'Tarif FCFA' },
              { key: 'availability', label: 'Disponibilité' },
            ] as { key: DoctorSearchSortBy; label: string }[]
          ).map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={[
                styles.sortChip,
                sortBy === opt.key && styles.sortChipActive,
              ]}
            >
              <Text
                style={[
                  styles.sortText,
                  sortBy === opt.key && styles.sortTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Recherche des praticiens vérifiés à Dakar...
            </Text>
          </View>
        ) : results.length > 0 ? (
          <>
            {results.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onPress={() => router.push(`/doctor/${doctor.id}`)}
              />
            ))}

            {hasMore && (
              <Pressable
                onPress={handleLoadMore}
                disabled={isLoadingMore}
                style={styles.loadMoreBtn}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Text style={styles.loadMoreText}>
                      Afficher plus de médecins ({results.length} / {totalCount})
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={18}
                      color={Colors.primary}
                    />
                  </>
                )}
              </Pressable>
            )}
          </>
        ) : (
          <EmptyState
            title="Aucun praticien correspondant"
            description="Aucun praticien vérifié ne correspond à vos filtres actuels. Essayez d'élargir votre recherche géographique à d'autres quartiers de Dakar."
            actionTitle="Réinitialiser les filtres"
            onActionPress={resetFilters}
          />
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterSummaryBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.xs,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  activePillText: {
    fontSize: Typography.fontSize.xs - 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  queryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  queryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    fontStyle: 'italic',
    flex: 1,
  },
  synonymBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: 6,
  },
  synonymBannerText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.primaryDark,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: 4,
  },
  sortLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.primary,
  },
  sortText: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
  sortTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  loadingBox: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  loadMoreText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});
