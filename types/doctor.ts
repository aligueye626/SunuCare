import { ConsultationType } from './appointment';
import { DoctorVerificationStatus } from './user';
import { MedicalFacility } from './facility';
import { MedicalSpecialtyItem } from './specialty';

export type FacilityItem = MedicalFacility;
export type SpecialtyCategoryItem = MedicalSpecialtyItem;

export type MedicalSpecialty =
  | 'Médecine Générale'
  | 'Cardiologie'
  | 'Pédiatrie'
  | 'Gynécologie & Obstétrique'
  | 'Dermatologie'
  | 'Ophtalmologie'
  | 'Dentisterie'
  | 'Neurologie'
  | 'Orthopédie'
  | 'ORL'
  | 'Radiologie'
  | 'Psychiatrie';

export const DAKAR_NEIGHBORHOODS = [
  'Plateau',
  'Almadies',
  'Sacré-Cœur',
  'Mermoz',
  'Fann',
  'Ouakam',
  'Grand Yoff',
  'Parcelles Assainies',
  'Liberté 6',
  'Médina',
  'Yoff',
  'Ngor',
] as const;

export type DakarNeighborhood = (typeof DAKAR_NEIGHBORHOODS)[number];

export interface DoctorListItem {
  id: string;
  fullName: string;
  specialty: MedicalSpecialty | string;
  subSpecialties?: string[];
  facilityId?: string;
  clinicName: string;
  address?: string;
  district: string;
  city?: string;
  consultationFeeFCFA: number;
  consultationTypes?: ConsultationType[];
  publicEmail?: string;
  professionalPhone?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  avatarUrl?: string;
  verificationStatus: DoctorVerificationStatus;
  isPubliclySearchable?: boolean;
  nextAvailableSlot?: string;
  nextAvailableLabel?: string;
  availableDates?: string[];
  availableSlotsByDate?: Record<string, string[]>;
  workingHoursSummary?: string;
  languages?: string[];
  education?: string[];
  experienceYears?: number;
  isFavorite?: boolean;
  relevanceScore?: number;
}

export type ConsultationTypeFilter = 'all' | ConsultationType;

export type DoctorSearchSortBy =
  | 'relevance'
  | 'rating'
  | 'price_asc'
  | 'price_desc'
  | 'availability';

export interface DoctorSearchFilters {
  query?: string;
  specialty?: string;
  district?: string;
  facilityName?: string;
  consultationType?: ConsultationTypeFilter;
  availableDate?: string; // 'any' | 'today' | 'tomorrow' | 'this_week' | 'YYYY-MM-DD'
  minPriceFCFA?: number;
  maxPriceFCFA?: number;
  sortBy?: DoctorSearchSortBy;
  page?: number;
  pageSize?: number;
}

export interface SearchSuggestionItem {
  id: string;
  label: string;
  subtitle: string;
  type: 'specialty' | 'neighborhood' | 'doctor' | 'facility' | 'synonym';
  queryValue: string;
  targetFilter?: Partial<DoctorSearchFilters>;
  entityId?: string;
}

export interface PaginatedSearchResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  resolvedSpecialty?: string;
  resolvedDistrict?: string;
}

export interface TimeSlotRange {
  id?: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface DayAvailability {
  dayName: string;
  dayIndex: number;
  isEnabled: boolean;
  slots: TimeSlotRange[];
}

export interface DoctorWeeklySchedule {
  dayName: string;
  dayIndex: number; // 0 = Lundi ... 6 = Dimanche
  isEnabled: boolean;
  slots: string[];
  slotRanges?: TimeSlotRange[];
}

export interface BlockedPeriod {
  id: string;
  doctorId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
  createdAt: string;
}

export interface CustomAvailableSlot {
  id: string;
  doctorId?: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface DoctorAvailabilityConfig {
  doctorId: string;
  consultationDurationMinutes: number;
  slotDurationMinutes?: number;
  isVacationMode: boolean;
  weeklySchedule: DoctorWeeklySchedule[];
  blockedPeriods: BlockedPeriod[];
  customAvailableSlots: CustomAvailableSlot[];
  customSlots?: CustomAvailableSlot[];
  updatedAt: string;
}

export interface DoctorDashboardStats {
  todayAppointmentsCount: number;
  pendingValidationCount: number;
  confirmedAppointmentsCount: number;
  monthlyPatientsCount: number;
  monthlyRevenueFCFA: number;
  averageRating: number;
  verificationStatus: DoctorVerificationStatus;
}
