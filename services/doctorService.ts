/**
 * Doctor & Healthcare Directory Service for SunuCare (Phase 5)
 * Core Business Rule: Doctors must have a professional verification status (verified)
 * before their profiles become publicly searchable.
 * Pending doctors must NEVER appear in public search results.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  DoctorListItem,
  DoctorSearchFilters,
  FacilityItem,
  PaginatedSearchResult,
  SearchSuggestionItem,
  SpecialtyCategoryItem,
} from '@/types/doctor';
import { DoctorProfile } from '@/types/user';
import {
  generateSearchSuggestions,
  matchesDakarDistrict,
  normalizeSearchText,
  rankAndFilterDoctors,
  resolveDistrictFromQuery,
  resolveSpecialtyFromQuery,
} from '@/utils/medicalSearchEngine';
import {
  MOCK_DOCTORS,
  MOCK_FACILITIES,
  MOCK_SPECIALTY_CATEGORIES,
  TODAY_ISO,
  TOMORROW_ISO,
} from './mockData';
import { favoriteService } from './favoriteService';

const STORAGE_KEY_DOCTOR_PROFILES = '@sunucare_doctor_profiles_v5';
const STORAGE_KEY_FAVORITE_DOCTORS = '@sunucare_fav_doctors_';
const STORAGE_KEY_FAVORITE_FACILITIES = '@sunucare_fav_facilities_';

async function loadLocalDoctors(): Promise<DoctorListItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DOCTOR_PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    await AsyncStorage.setItem(
      STORAGE_KEY_DOCTOR_PROFILES,
      JSON.stringify(MOCK_DOCTORS)
    );
    return [...MOCK_DOCTORS];
  } catch {
    return [...MOCK_DOCTORS];
  }
}

function mapSupabaseDoctorRow(d: any): DoctorListItem {
  return {
    id: d.id,
    fullName: d.full_name || 'Dr. Praticien',
    specialty: d.specialty || 'Médecine Générale',
    subSpecialties: Array.isArray(d.sub_specialties) ? d.sub_specialties : [],
    facilityId: d.facility_id || undefined,
    clinicName: d.clinic_name || 'Cabinet Médical Dakar',
    address: d.address || `${d.district || 'Plateau'}, Dakar`,
    district: d.district || 'Plateau',
    city: d.city || 'Dakar',
    consultationFeeFCFA: d.consultation_fee || 20000,
    consultationTypes: Array.isArray(d.consultation_types)
      ? d.consultation_types
      : ['in_person'],
    publicEmail: d.public_email || undefined,
    professionalPhone: d.professional_phone || undefined,
    bio: d.bio || undefined,
    rating: Number(d.rating) || 4.8,
    reviewCount: Number(d.review_count) || 0,
    avatarUrl: d.avatar_url || undefined,
    verificationStatus: 'verified',
    isPubliclySearchable: true,
    nextAvailableSlot: d.next_available_slot || 'Consulter les horaires',
    availableDates: Array.isArray(d.available_dates) ? d.available_dates : [],
    workingHoursSummary:
      d.working_hours_summary || 'Lun - Ven : 08:30 - 17:30',
    experienceYears: d.experience_years || 5,
    isFavorite: false,
    relevanceScore: Number(d.relevance_score) || 50,
  };
}

export const doctorService = {
  /**
   * Sync a DoctorProfile update to the directory store
   * Preserves verificationStatus strictly — a pending doctor remains hidden from public search
   */
  async syncDoctorProfileToDirectory(profile: DoctorProfile): Promise<void> {
    try {
      const currentList = await loadLocalDoctors();
      const idx = currentList.findIndex((d) => d.id === profile.id);
      const existing = idx >= 0 ? currentList[idx] : undefined;

      const matchedFacility = MOCK_FACILITIES.find(
        (f) =>
          normalizeSearchText(f.name) ===
          normalizeSearchText(profile.facilityName)
      );

      const mappedItem: DoctorListItem = {
        id: profile.id,
        fullName: profile.fullName.startsWith('Dr.')
          ? profile.fullName
          : `Dr. ${profile.fullName}`,
        specialty: profile.specialty,
        subSpecialties: profile.subSpecialties || existing?.subSpecialties || [],
        facilityId: matchedFacility?.id || existing?.facilityId,
        clinicName: profile.facilityName,
        address: profile.facilityAddress,
        district: profile.facilityDistrict,
        city: 'Dakar',
        consultationFeeFCFA: profile.consultationFeeFCFA,
        consultationTypes:
          profile.consultationTypes ||
          existing?.consultationTypes || ['in_person'],
        publicEmail: profile.publicEmail || existing?.publicEmail,
        professionalPhone:
          profile.professionalPhone || existing?.professionalPhone,
        bio: profile.bio || existing?.bio,
        rating: existing?.rating ?? 5.0,
        reviewCount: existing?.reviewCount ?? 0,
        avatarUrl: profile.avatarUrl || existing?.avatarUrl,
        nextAvailableSlot: existing?.nextAvailableSlot || 'Demain à 09:30',
        availableDates: existing?.availableDates || [TODAY_ISO, TOMORROW_ISO],
        availableSlotsByDate: existing?.availableSlotsByDate,
        workingHoursSummary:
          existing?.workingHoursSummary || 'Lun - Ven : 08:30 - 17:30',
        verificationStatus: profile.verificationStatus,
        isPubliclySearchable: profile.isPubliclySearchable,
        isFavorite: existing?.isFavorite ?? false,
      };

      if (idx >= 0) {
        currentList[idx] = mappedItem;
      } else {
        currentList.push(mappedItem);
      }

      await AsyncStorage.setItem(
        STORAGE_KEY_DOCTOR_PROFILES,
        JSON.stringify(currentList)
      );
    } catch {
      // Non-blocking
    }
  },

  /**
   * Advanced Server-Side & Intelligent Paginated Search for Verified Doctors
   * Supports:
   * - Doctor name, specialty, facility, Dakar neighborhood, consultation type, availability, price range
   * - Synonyms ("coeur" -> Cardiologie, "peau" -> Dermatologie, "dents" -> Dentisterie, "enfants" -> Pédiatrie, "yeux" -> Ophtalmologie)
   * - Typo tolerance, relevance ranking, and pagination
   * - STRICT RULE: Only verified and active doctors are ever returned
   */
  async searchDoctors(
    filters: DoctorSearchFilters = {}
  ): Promise<PaginatedSearchResult<DoctorListItem>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, filters.pageSize || 6);
    const offset = (page - 1) * pageSize;

    const resolvedSpecialty =
      filters.specialty && filters.specialty !== 'Tous'
        ? resolveSpecialtyFromQuery(filters.specialty) || filters.specialty
        : resolveSpecialtyFromQuery(filters.query);

    const resolvedDistrict =
      filters.district && filters.district !== 'Tous'
        ? resolveDistrictFromQuery(filters.district) || filters.district
        : resolveDistrictFromQuery(filters.query);

    // 1. Server-side search via Supabase RPC or indexed paginated query (does not download full DB)
    if (isSupabaseConfigured()) {
      try {
        const targetDate =
          filters.availableDate === 'today'
            ? TODAY_ISO
            : filters.availableDate === 'tomorrow'
              ? TOMORROW_ISO
              : filters.availableDate;

        const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
          'search_verified_doctors',
          {
            p_query: filters.query || '',
            p_specialty:
              filters.specialty && filters.specialty !== 'Tous'
                ? filters.specialty
                : resolvedSpecialty || null,
            p_district:
              filters.district && filters.district !== 'Tous'
                ? filters.district
                : resolvedDistrict || null,
            p_consultation_type:
              filters.consultationType && filters.consultationType !== 'all'
                ? filters.consultationType
                : null,
            p_available_date:
              targetDate && targetDate !== 'any' && targetDate !== 'this_week'
                ? targetDate
                : null,
            p_min_price: filters.minPriceFCFA || null,
            p_max_price: filters.maxPriceFCFA || null,
            p_limit: pageSize,
            p_offset: offset,
          }
        );

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          const totalCount = Number(rpcData[0].total_count) || rpcData.length;
          const items = rpcData.map(mapSupabaseDoctorRow);
          return {
            items,
            totalCount,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
            hasMore: offset + items.length < totalCount,
            resolvedSpecialty,
            resolvedDistrict,
          };
        }
      } catch {
        // Fallback to local indexed search engine
      }
    }

    // 2. Local Intelligent Search Engine with ranking & pagination
    const allDoctors = await loadLocalDoctors();
    return rankAndFilterDoctors(allDoctors, {
      ...filters,
      page,
      pageSize,
    });
  },

  /**
   * Fetch verified doctors list (convenience method for Home & Directory previews)
   * STRICT FILTER: verification_status = 'verified' AND is_publicly_searchable = true
   */
  async getVerifiedDoctors(
    filters?: DoctorSearchFilters
  ): Promise<DoctorListItem[]> {
    const result = await this.searchDoctors({
      ...filters,
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 20,
    });
    return result.items;
  },

  /**
   * Generate autocomplete suggestions for search bar
   */
  async getSearchSuggestions(
    query: string,
    limit = 6
  ): Promise<SearchSuggestionItem[]> {
    const [verifiedDoctors, facilities] = await Promise.all([
      this.getVerifiedDoctors({ pageSize: 20 }),
      this.getFacilities(),
    ]);
    return generateSearchSuggestions(
      query,
      verifiedDoctors,
      facilities,
      limit
    );
  },

  /**
   * Fetch verified doctor details by ID
   * Returns null if doctor is pending or does not exist
   */
  async getDoctorById(id: string): Promise<DoctorListItem | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (
          supabase.from('doctor_details' as any) as any
        )
          .select('*')
          .eq('id', id)
          .eq('verification_status', 'verified')
          .eq('is_publicly_searchable', true)
          .single();

        if (!error && data) {
          return mapSupabaseDoctorRow(data);
        }
      } catch {
        // Fallback to local store
      }
    }

    const allDoctors = await loadLocalDoctors();
    const lookupId = id === 'doc-1' ? 'doc_pre_1' : id;
    const found = allDoctors.find(
      (d) =>
        (d.id === lookupId || d.id === id) &&
        d.verificationStatus === 'verified' &&
        d.isPubliclySearchable !== false
    );
    return found || null;
  },

  /**
   * Fetch medical specialty categories for Dakar
   */
  async getSpecialties(): Promise<SpecialtyCategoryItem[]> {
    return MOCK_SPECIALTY_CATEGORIES;
  },

  /**
   * Fetch healthcare facilities in Dakar with optional search & neighborhood filter
   */
  async getFacilities(filters?: {
    query?: string;
    district?: string;
  }): Promise<FacilityItem[]> {
    if (isSupabaseConfigured()) {
      try {
        let q = (supabase.from('facilities' as any) as any).select('*');
        if (filters?.district && filters.district !== 'Tous') {
          q = q.ilike('district', `%${filters.district}%`);
        }
        if (filters?.query && filters.query.trim()) {
          q = q.ilike('name', `%${filters.query.trim()}%`);
        }
        const { data, error } = await q.limit(20);
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((row: any) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            district: row.district,
            city: row.city || 'Dakar',
            address: row.address,
            phone: row.phone,
            email: row.email || undefined,
            description: row.description || undefined,
            rating: Number(row.rating) || 4.7,
            reviewCount: Number(row.review_count) || 0,
            availableSpecialties: row.available_specialties || [],
            availableServices: row.available_services || [],
            isOpen24h: Boolean(row.is_open_24h),
            emergencyAvailable: Boolean(row.emergency_available),
            latitude: row.latitude ? Number(row.latitude) : undefined,
            longitude: row.longitude ? Number(row.longitude) : undefined,
          }));
        }
      } catch {
        // Fallback to MOCK_FACILITIES
      }
    }

    const normQuery = normalizeSearchText(filters?.query);
    const resolvedSpec = resolveSpecialtyFromQuery(filters?.query);
    const resolvedDist = resolveDistrictFromQuery(filters?.query);

    return MOCK_FACILITIES.filter((fac) => {
      if (filters?.district && filters.district !== 'Tous') {
        if (!matchesDakarDistrict(fac.district, filters.district)) {
          return false;
        }
      }

      if (!normQuery) return true;

      const normName = normalizeSearchText(fac.name);
      const normDist = normalizeSearchText(fac.district);
      const normAddr = normalizeSearchText(fac.address);
      const normSpecs = normalizeSearchText(fac.availableSpecialties.join(' '));
      const normServices = normalizeSearchText(
        (fac.availableServices || []).join(' ')
      );

      if (
        normName.includes(normQuery) ||
        normDist.includes(normQuery) ||
        normAddr.includes(normQuery) ||
        normSpecs.includes(normQuery) ||
        normServices.includes(normQuery)
      ) {
        return true;
      }

      if (
        resolvedSpec &&
        normSpecs.includes(normalizeSearchText(resolvedSpec))
      ) {
        return true;
      }

      if (resolvedDist && matchesDakarDistrict(fac.district, resolvedDist)) {
        return true;
      }

      return false;
    });
  },

  /**
   * Fetch single facility by ID
   */
  async getFacilityById(facilityId: string): Promise<FacilityItem | null> {
    const facilities = await this.getFacilities();
    return facilities.find((f) => f.id === facilityId) || null;
  },

  /**
   * Find a facility by its name or ID
   */
  async findFacilityForDoctor(doctor: DoctorListItem): Promise<FacilityItem | null> {
    const facilities = await this.getFacilities();
    if (doctor.facilityId) {
      const byId = facilities.find((f) => f.id === doctor.facilityId);
      if (byId) return byId;
    }
    const normClinic = normalizeSearchText(doctor.clinicName);
    return (
      facilities.find((f) => normalizeSearchText(f.name) === normClinic) ||
      null
    );
  },

  /**
   * Get verified doctors associated with a specific healthcare facility
   */
  async getDoctorsByFacility(facility: FacilityItem): Promise<DoctorListItem[]> {
    const verifiedDoctors = await this.getVerifiedDoctors({ pageSize: 50 });
    const normFacName = normalizeSearchText(facility.name);
    return verifiedDoctors.filter(
      (doc) =>
        doc.facilityId === facility.id ||
        normalizeSearchText(doc.clinicName) === normFacName
    );
  },

  /**
   * Get patient's favorite doctor IDs (persisted in Supabase & deduplicated via favoriteService)
   */
  async getFavoriteDoctorIds(patientId: string): Promise<string[]> {
    return favoriteService.getFavoriteDoctorIds(patientId);
  },

  /**
   * Add a verified doctor to patient's favorites (prevents duplicate entries)
   */
  async addFavoriteDoctor(patientId: string, doctorId: string) {
    return favoriteService.addFavoriteDoctor(patientId, doctorId);
  },

  /**
   * Remove a doctor from patient's favorites
   */
  async removeFavoriteDoctor(patientId: string, doctorId: string) {
    return favoriteService.removeFavoriteDoctor(patientId, doctorId);
  },

  /**
   * Toggle a doctor in patient's favorites
   */
  async toggleFavoriteDoctor(
    patientId: string,
    doctorId: string
  ): Promise<string[]> {
    return favoriteService.toggleFavoriteDoctor(patientId, doctorId);
  },

  /**
   * Get patient's favorite facility IDs
   */
  async getFavoriteFacilityIds(patientId: string): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(
        `${STORAGE_KEY_FAVORITE_FACILITIES}${patientId}`
      );
      if (raw) {
        return JSON.parse(raw);
      }
      const defaults = ['fac-1', 'fac-2'];
      await AsyncStorage.setItem(
        `${STORAGE_KEY_FAVORITE_FACILITIES}${patientId}`,
        JSON.stringify(defaults)
      );
      return defaults;
    } catch {
      return ['fac-1', 'fac-2'];
    }
  },

  /**
   * Toggle a facility in patient's favorites
   */
  async toggleFavoriteFacility(
    patientId: string,
    facilityId: string
  ): Promise<string[]> {
    const current = await this.getFavoriteFacilityIds(patientId);
    const next = current.includes(facilityId)
      ? current.filter((id) => id !== facilityId)
      : [...current, facilityId];
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEY_FAVORITE_FACILITIES}${patientId}`,
        JSON.stringify(next)
      );
    } catch {
      // Non-blocking
    }
    return next;
  },
};

export default doctorService;
