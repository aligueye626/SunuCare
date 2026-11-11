/**
 * Intelligent Medical Search Engine for SunuCare (Dakar, Senegal)
 * Supports:
 * - Case-insensitive & accent-insensitive normalization
 * - Partial word matching & multi-token queries
 * - Misspelling tolerance (Levenshtein edit distance)
 * - Medical specialty synonyms ("coeur" -> Cardiologie, "peau" -> Dermatologie, "dents" -> Dentisterie, "enfants" -> Pédiatrie, "yeux" -> Ophtalmologie, etc.)
 * - Dakar neighborhood synonyms (12 covered neighborhoods)
 * - Relevance ranking & pagination
 */

import {
  DAKAR_NEIGHBORHOODS,
  DoctorListItem,
  DoctorSearchFilters,
  FacilityItem,
  PaginatedSearchResult,
  SearchSuggestionItem,
} from '@/types/doctor';
import { TODAY_ISO, TOMORROW_ISO, IN_5_DAYS_ISO } from '@/services/mockData';

/**
 * Normalize text: lowercase, replace ligatures (œ -> oe, æ -> ae), strip accents & punctuation
 */
export function normalizeSearchText(input?: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Medical Specialty Synonym Dictionary (French / Dakar patient terms -> Canonical Specialty)
 */
export const SPECIALTY_SYNONYMS: Record<string, string[]> = {
  Cardiologie: [
    'coeur',
    'cœur',
    'coeure',
    'cardio',
    'cardiologue',
    'cardiologie',
    'tension',
    'hypertension',
    'ecg',
    'echocardiographie',
    'palpitation',
    'palpitations',
    'artere',
    'thoracique',
    'holter',
  ],
  Dermatologie: [
    'peau',
    'peaux',
    'dermato',
    'dermatologue',
    'dermatologie',
    'bouton',
    'boutons',
    'acne',
    'eczema',
    'allergie',
    'demangeaison',
    'cheveux',
    'cuir chevelu',
    'tache',
    ' mycose',
  ],
  Dentisterie: [
    'dents',
    'dent',
    'dentaire',
    'dentiste',
    'dentisterie',
    'chirurgien dentiste',
    'carie',
    'caries',
    'gencive',
    'gencives',
    'detartrage',
    'orthodontie',
    'appareil dentaire',
    'implant',
    'odonto',
    'rage de dent',
    'machoire',
  ],
  Pédiatrie: [
    'enfants',
    'enfant',
    'bebe',
    'bebes',
    'nourrisson',
    'nouveau ne',
    'pediatre',
    'pediatrie',
    'pediatrique',
    'vaccin',
    'vaccination',
    'croissance',
  ],
  Ophtalmologie: [
    'yeux',
    'oeil',
    'œil',
    'vue',
    'vision',
    'lunettes',
    'lentilles',
    'ophtalmo',
    'opthalmo',
    'ophtalmologue',
    'ophtalmologie',
    'cataracte',
    'glaucome',
    'myopie',
    'fond d oeil',
  ],
  'Gynécologie & Obstétrique': [
    'gyneco',
    'gynecologue',
    'gynecologie',
    'obstetrique',
    'femme',
    'grossesse',
    'enceinte',
    'accouchement',
    'maternite',
    'prenatal',
    'echographie',
    'senologie',
    'fertilite',
  ],
  ORL: [
    'orl',
    'oreille',
    'oreilles',
    'nez',
    'gorge',
    'sinusite',
    'angine',
    'otite',
    'audition',
    'sourdité',
    'vertige',
    'vertiges',
    'acouphene',
  ],
  Orthopédie: [
    'os',
    'fracture',
    'articulation',
    'articulations',
    'genou',
    'epaule',
    'hanche',
    'dos',
    'colonne',
    'arthrose',
    'entorse',
    'traumato',
    'traumatologue',
    'orthopedie',
    'orthopediste',
    'rhumatologie',
  ],
  Neurologie: [
    'cerveau',
    'nerf',
    'nerfs',
    'migraine',
    'migraines',
    'cephalee',
    'maux de tete',
    'neuro',
    'neurologue',
    'neurologie',
    'epilepsie',
    'avc',
    'memoire',
  ],
  'Médecine Générale': [
    'generaliste',
    'medecin generaliste',
    'medecine generale',
    'fievre',
    'palu',
    'paludisme',
    'grippe',
    'toux',
    'fatigue',
    'bilan',
    'checkup',
    'ordonnance',
    'certificat',
    'famille',
  ],
};

/**
 * Location Synonym Dictionary for Dakar's 12 Covered Neighborhoods
 */
export const DAKAR_LOCATION_SYNONYMS: Record<string, string[]> = {
  Plateau: [
    'plateau',
    'dakar plateau',
    'centre ville',
    'ville',
    'independance',
    'place de l independance',
    'pasteur',
    'avenue pasteur',
    'jambars',
    'diambars',
    'mandela',
  ],
  Almadies: [
    'almadies',
    'les almadies',
    'pointe des almadies',
    'route des almadies',
    'mamelles',
    'phare des mamelles',
  ],
  'Sacré-Cœur': [
    'sacre coeur',
    'sacre-coeur',
    'sacrecoeur',
    'sc3',
    'sacre coeur 1',
    'sacre coeur 2',
    'sacre coeur 3',
    'vdn',
  ],
  Mermoz: [
    'mermoz',
    'mermoz pyrotechnie',
    'pyrotechnie',
    'cices',
    'avenue cheikh anta diop',
  ],
  Fann: [
    'fann',
    'fann residence',
    'fann-residence',
    'fann hock',
    'point e',
    'point-e',
    'ucad',
    'corniche ouest',
  ],
  Ouakam: [
    'ouakam',
    'monument de la renaissance',
    'cite avion',
    'cite comico',
    'corniche ouakam',
  ],
  'Grand Yoff': [
    'grand yoff',
    'grand-yoff',
    'grandyoff',
    'hoggy',
    'cto',
    'idp',
    'patte d oie',
    'hlm grand yoff',
  ],
  'Parcelles Assainies': [
    'parcelles',
    'parcelles assainies',
    'parcelle',
    'pa',
    'unite 15',
    'unite',
    'ponty parcelles',
  ],
  'Liberté 6': [
    'liberte',
    'liberte 6',
    'liberte 6 extension',
    'lib 6',
    'lib6',
    'sicap liberte',
    'jvc',
    'camp penal',
  ],
  Médina: [
    'medina',
    'la medina',
    'tilene',
    'blaise diagne',
    'avenue blaise diagne',
    'gueule tapee',
    'soumbedioune',
  ],
  Yoff: [
    'yoff',
    'virage',
    'yoff virage',
    'yoff tonghor',
    'ouest foire',
    'nord foire',
    'aeroport',
  ],
  Ngor: [
    'ngor',
    'baie de ngor',
    'ile de ngor',
    'village de ngor',
    'ngor almadies',
  ],
};

/**
 * Compute Levenshtein edit distance between two normalized strings (for typo tolerance)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if a token fuzzy-matches a target word or phrase
 */
export function isTokenFuzzyMatch(queryToken: string, candidateText: string): boolean {
  const normToken = normalizeSearchText(queryToken);
  const normCandidate = normalizeSearchText(candidateText);

  if (!normToken || !normCandidate) return false;
  if (normCandidate.includes(normToken) || normToken.includes(normCandidate)) {
    return true;
  }

  // Only apply edit distance for tokens >= 4 chars
  if (normToken.length < 4) return false;

  const candidateWords = normCandidate.split(' ');
  const maxAllowedDistance = normToken.length >= 7 ? 2 : 1;

  for (const word of candidateWords) {
    if (word.length < 3) continue;
    if (Math.abs(word.length - normToken.length) <= maxAllowedDistance) {
      if (levenshteinDistance(normToken, word) <= maxAllowedDistance) {
        return true;
      }
    }
    // Prefix fuzzy check (e.g. "cardiologi" vs "cardiologie")
    if (word.length > normToken.length) {
      const prefix = word.slice(0, normToken.length);
      if (levenshteinDistance(normToken, prefix) <= 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolve a free-text query or token to a canonical Medical Specialty via synonyms & fuzzy matching
 */
export function resolveSpecialtyFromQuery(rawQuery?: string): string | undefined {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) return undefined;

  const queryTokens = normQuery.split(' ').filter((t) => t.length >= 2);

  for (const [specialty, synonyms] of Object.entries(SPECIALTY_SYNONYMS)) {
    const normSpecialty = normalizeSearchText(specialty);
    if (normQuery.includes(normSpecialty) || normSpecialty.includes(normQuery)) {
      return specialty;
    }

    for (const syn of synonyms) {
      const normSyn = normalizeSearchText(syn);
      if (normQuery === normSyn || normQuery.includes(normSyn)) {
        return specialty;
      }
      for (const token of queryTokens) {
        if (token === normSyn || isTokenFuzzyMatch(token, normSyn)) {
          return specialty;
        }
      }
    }
  }

  return undefined;
}

/**
 * Resolve a free-text query or token to a canonical Dakar Neighborhood via location synonyms
 */
export function resolveDistrictFromQuery(rawQuery?: string): string | undefined {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) return undefined;

  // Pass 1: Exact normalized match on canonical neighborhood name or synonym
  for (const [district, synonyms] of Object.entries(DAKAR_LOCATION_SYNONYMS)) {
    const normDistrict = normalizeSearchText(district);
    if (normQuery === normDistrict) {
      return district;
    }
    for (const syn of synonyms) {
      if (normQuery === normalizeSearchText(syn)) {
        return district;
      }
    }
  }

  // Pass 2: Substring match on full neighborhood name or multi-char synonym
  for (const [district, synonyms] of Object.entries(DAKAR_LOCATION_SYNONYMS)) {
    const normDistrict = normalizeSearchText(district);
    if (normQuery.includes(normDistrict)) {
      return district;
    }
    for (const syn of synonyms) {
      const normSyn = normalizeSearchText(syn);
      if (normSyn.length >= 3 && normQuery.includes(normSyn)) {
        return district;
      }
    }
  }

  // Pass 3: Fuzzy match on individual tokens (for misspellings like "almadie", "parcele")
  const queryTokens = normQuery.split(' ').filter((t) => t.length >= 4);
  for (const [district, synonyms] of Object.entries(DAKAR_LOCATION_SYNONYMS)) {
    for (const syn of synonyms) {
      const normSyn = normalizeSearchText(syn);
      if (normSyn.includes(' ')) continue; // Only fuzzy-match single-word synonyms against single tokens
      for (const token of queryTokens) {
        if (isTokenFuzzyMatch(token, normSyn)) {
          return district;
        }
      }
    }
  }

  return undefined;
}

/**
 * Check if a doctor's district matches a selected neighborhood filter (with synonym support)
 */
export function matchesDakarDistrict(doctorDistrict: string, filterDistrict?: string): boolean {
  if (!filterDistrict || filterDistrict === 'Tous') return true;
  const normDoc = normalizeSearchText(doctorDistrict);
  const normFilter = normalizeSearchText(filterDistrict);

  if (normDoc === normFilter) {
    return true;
  }

  const canonicalDoc = resolveDistrictFromQuery(doctorDistrict) || doctorDistrict;
  const canonicalFilter = resolveDistrictFromQuery(filterDistrict) || filterDistrict;

  if (normalizeSearchText(canonicalDoc) === normalizeSearchText(canonicalFilter)) {
    return true;
  }

  return false;
}

/**
 * Check if a doctor has available slots matching the requested availability filter
 */
export function matchesAvailabilityFilter(
  doctor: DoctorListItem,
  availableDateFilter?: string
): boolean {
  if (!availableDateFilter || availableDateFilter === 'any' || availableDateFilter === 'Tous') {
    return true;
  }

  const dates = doctor.availableDates || [];
  const nextSlotNorm = normalizeSearchText(doctor.nextAvailableSlot || '');

  if (availableDateFilter === 'today') {
    return dates.includes(TODAY_ISO) || nextSlotNorm.includes('aujourd');
  }

  if (availableDateFilter === 'tomorrow') {
    return (
      dates.includes(TODAY_ISO) ||
      dates.includes(TOMORROW_ISO) ||
      nextSlotNorm.includes('aujourd') ||
      nextSlotNorm.includes('demain')
    );
  }

  if (availableDateFilter === 'this_week') {
    return dates.some((d) => d >= TODAY_ISO && d <= IN_5_DAYS_ISO) || dates.length > 0;
  }

  // Exact YYYY-MM-DD date
  return dates.includes(availableDateFilter);
}

/**
 * Rank, filter, and paginate verified doctors
 * STRICT RULE: Only verified and publicly searchable doctors are ever returned
 */
export function rankAndFilterDoctors(
  allDoctors: DoctorListItem[],
  filters: DoctorSearchFilters = {}
): PaginatedSearchResult<DoctorListItem> {
  const rawQuery = (filters.query || '').trim();
  const normQuery = normalizeSearchText(rawQuery);
  const queryTokens = normQuery ? normQuery.split(' ').filter(Boolean) : [];

  const resolvedSpecialty = resolveSpecialtyFromQuery(rawQuery);
  const resolvedDistrict = resolveDistrictFromQuery(rawQuery);

  const scoredResults: DoctorListItem[] = [];

  for (const doc of allDoctors) {
    // 1. STRICT SECURITY & BUSINESS RULE: Never return pending or rejected doctors
    if (doc.verificationStatus !== 'verified' || doc.isPubliclySearchable === false) {
      continue;
    }

    // 2. Explicit Specialty Filter
    if (filters.specialty && filters.specialty !== 'Tous') {
      const targetSpec = resolveSpecialtyFromQuery(filters.specialty) || filters.specialty;
      const normDocSpec = normalizeSearchText(doc.specialty);
      const normTargetSpec = normalizeSearchText(targetSpec);
      if (!normDocSpec.includes(normTargetSpec) && !normTargetSpec.includes(normDocSpec)) {
        continue;
      }
    }

    // 3. Explicit Neighborhood (District) Filter
    if (filters.district && filters.district !== 'Tous') {
      if (!matchesDakarDistrict(doc.district, filters.district)) {
        continue;
      }
    }

    // 4. Explicit Facility Filter
    if (filters.facilityName && filters.facilityName.trim()) {
      const normFac = normalizeSearchText(filters.facilityName);
      if (!normalizeSearchText(doc.clinicName).includes(normFac)) {
        continue;
      }
    }

    // 5. Explicit Consultation Type Filter
    if (filters.consultationType && filters.consultationType !== 'all') {
      const types = doc.consultationTypes || ['in_person'];
      if (!types.includes(filters.consultationType)) {
        continue;
      }
    }

    // 6. Explicit Appointment Availability Filter
    if (filters.availableDate && filters.availableDate !== 'any') {
      if (!matchesAvailabilityFilter(doc, filters.availableDate)) {
        continue;
      }
    }

    // 7. Explicit Price Range Filter (FCFA)
    if (typeof filters.minPriceFCFA === 'number' && filters.minPriceFCFA > 0) {
      if (doc.consultationFeeFCFA < filters.minPriceFCFA) {
        continue;
      }
    }
    if (typeof filters.maxPriceFCFA === 'number' && filters.maxPriceFCFA > 0) {
      if (doc.consultationFeeFCFA > filters.maxPriceFCFA) {
        continue;
      }
    }

    // 8. Intelligent Free-Text Query Matching & Relevance Scoring
    let relevanceScore = 0;

    if (!normQuery) {
      // Base score when browsing without text query
      relevanceScore = doc.rating * 10 + (doc.availableDates?.includes(TODAY_ISO) ? 5 : 0);
    } else {
      const normName = normalizeSearchText(doc.fullName);
      const normSpec = normalizeSearchText(doc.specialty);
      const normSubSpecs = normalizeSearchText((doc.subSpecialties || []).join(' '));
      const normClinic = normalizeSearchText(doc.clinicName);
      const normDistrict = normalizeSearchText(doc.district);
      const normBio = normalizeSearchText(doc.bio || '');
      const isBareCoeurQuery = normQuery === 'coeur' && !normQuery.includes('sacre');
      const normClinicForMatch = isBareCoeurQuery
        ? normClinic.replace(/sacre coeur/g, '')
        : normClinic;
      const normDistrictForMatch = isBareCoeurQuery
        ? normDistrict.replace(/sacre coeur/g, '')
        : normDistrict;
      const fullSearchableBlob = `${normName} ${normSpec} ${normSubSpecs} ${normClinicForMatch} ${normDistrictForMatch} ${normBio}`;

      // Direct / Exact phrase matches
      if (normName.includes(normQuery)) {
        relevanceScore += 140;
      }
      if (normSpec.includes(normQuery)) {
        relevanceScore += 160;
      }
      if (normSubSpecs.includes(normQuery)) {
        relevanceScore += 110;
      }
      if (normClinicForMatch.includes(normQuery)) {
        relevanceScore += 80;
      }
      if (normDistrictForMatch.includes(normQuery)) {
        relevanceScore += 75;
      }

      // Synonym matches ("coeur" -> Cardiologie, "peau" -> Dermatologie, etc.)
      if (resolvedSpecialty) {
        const normResolvedSpec = normalizeSearchText(resolvedSpecialty);
        if (normSpec.includes(normResolvedSpec) || normResolvedSpec.includes(normSpec)) {
          relevanceScore += 180;
        }
      }

      // Location synonym matches ("sc3" -> Sacré-Cœur, "hoggy" -> Grand Yoff, etc.)
      if (resolvedDistrict && matchesDakarDistrict(doc.district, resolvedDistrict)) {
        relevanceScore += 75;
      }

      // Token-by-token partial and fuzzy matching (supports multi-word like "cardio plateau" or typos)
      let matchedTokensCount = 0;
      for (const token of queryTokens) {
        // Ignore common French stop words in multi-token queries
        if (['de', 'du', 'des', 'le', 'la', 'les', 'au', 'aux', 'a', 'et', 'dr'].includes(token)) {
          matchedTokensCount++;
          continue;
        }

        const tokenSpec = resolveSpecialtyFromQuery(token);
        const tokenDist = resolveDistrictFromQuery(token);

        const directTokenHit =
          fullSearchableBlob.includes(token) ||
          (tokenSpec &&
            normalizeSearchText(doc.specialty).includes(normalizeSearchText(tokenSpec))) ||
          (tokenDist && matchesDakarDistrict(doc.district, tokenDist));

        if (directTokenHit) {
          matchedTokensCount++;
          relevanceScore += 30;
        } else if (
          isTokenFuzzyMatch(token, normName) ||
          isTokenFuzzyMatch(token, normSpec) ||
          isTokenFuzzyMatch(token, normSubSpecs) ||
          isTokenFuzzyMatch(token, normClinic) ||
          isTokenFuzzyMatch(token, normDistrict)
        ) {
          matchedTokensCount++;
          relevanceScore += 20;
        }
      }

      // If multi-token query (e.g. "pédiatre mermoz"), require all meaningful tokens to match
      if (queryTokens.length > 1 && matchedTokensCount < queryTokens.length) {
        relevanceScore = 0;
      }

      if (relevanceScore <= 0) {
        continue;
      }

      // Tie-breaker bonus for rating and immediate availability
      relevanceScore += doc.rating * 2;
      if (doc.availableDates?.includes(TODAY_ISO)) {
        relevanceScore += 4;
      }
    }

    scoredResults.push({
      ...doc,
      relevanceScore,
    });
  }

  // 9. Sort Results
  const sortBy = filters.sortBy || 'relevance';
  scoredResults.sort((a, b) => {
    if (sortBy === 'price_asc') {
      return a.consultationFeeFCFA - b.consultationFeeFCFA;
    }
    if (sortBy === 'price_desc') {
      return b.consultationFeeFCFA - a.consultationFeeFCFA;
    }
    if (sortBy === 'rating') {
      return b.rating - a.rating || (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }
    if (sortBy === 'availability') {
      const aToday = a.availableDates?.includes(TODAY_ISO) ? 1 : 0;
      const bToday = b.availableDates?.includes(TODAY_ISO) ? 1 : 0;
      if (aToday !== bToday) return bToday - aToday;
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }
    // Default: relevance ranking
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });

  // 10. Pagination
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(1, filters.pageSize || 6);
  const totalCount = scoredResults.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = scoredResults.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasMore: startIndex + paginatedItems.length < totalCount,
    resolvedSpecialty,
    resolvedDistrict,
  };
}

/**
 * Generate intelligent autocomplete suggestions for Dakar Medical Search
 */
export function generateSearchSuggestions(
  rawQuery: string,
  verifiedDoctors: DoctorListItem[],
  facilities: FacilityItem[],
  limit = 6
): SearchSuggestionItem[] {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery || normQuery.length < 2) {
    return [];
  }

  const suggestions: SearchSuggestionItem[] = [];

  // 1. Check symptom/synonym -> Specialty suggestions (e.g., "coeur" -> Cardiologie)
  const resolvedSpecialty = resolveSpecialtyFromQuery(rawQuery);
  if (resolvedSpecialty) {
    const normResolved = normalizeSearchText(resolvedSpecialty);
    const isSynonymTrigger = !normResolved.startsWith(normQuery);
    suggestions.push({
      id: `sug_spec_${resolvedSpecialty}`,
      label: isSynonymTrigger
        ? `"${rawQuery.trim()}" → ${resolvedSpecialty}`
        : resolvedSpecialty,
      subtitle: 'Spécialité médicale à Dakar',
      type: isSynonymTrigger ? 'synonym' : 'specialty',
      queryValue: resolvedSpecialty,
      targetFilter: { specialty: resolvedSpecialty },
    });
  }

  // 2. Check neighborhood/location suggestions
  for (const neighborhood of DAKAR_NEIGHBORHOODS) {
    if (
      normalizeSearchText(neighborhood).includes(normQuery) ||
      resolveDistrictFromQuery(rawQuery) === neighborhood
    ) {
      if (!suggestions.some((s) => s.label === `Quartier ${neighborhood}`)) {
        suggestions.push({
          id: `sug_dist_${neighborhood}`,
          label: `Quartier ${neighborhood}`,
          subtitle: 'Dakar, Sénégal',
          type: 'neighborhood',
          queryValue: neighborhood,
          targetFilter: { district: neighborhood },
        });
      }
    }
  }

  // 3. Matching Verified Doctors
  for (const doc of verifiedDoctors) {
    if (doc.verificationStatus !== 'verified') continue;
    if (
      normalizeSearchText(doc.fullName).includes(normQuery) ||
      isTokenFuzzyMatch(normQuery, doc.fullName)
    ) {
      suggestions.push({
        id: `sug_doc_${doc.id}`,
        label: doc.fullName,
        subtitle: `${doc.specialty} • ${doc.clinicName} (${doc.district})`,
        type: 'doctor',
        queryValue: doc.fullName,
        entityId: doc.id,
      });
    }
  }

  // 4. Matching Healthcare Facilities
  for (const fac of facilities) {
    if (
      normalizeSearchText(fac.name).includes(normQuery) ||
      isTokenFuzzyMatch(normQuery, fac.name)
    ) {
      suggestions.push({
        id: `sug_fac_${fac.id}`,
        label: fac.name,
        subtitle: `Établissement • ${fac.district}, Dakar`,
        type: 'facility',
        queryValue: fac.name,
        entityId: fac.id,
      });
    }
  }

  return suggestions.slice(0, limit);
}
