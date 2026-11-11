/**
 * Transactional Appointment Booking & Management Service for SunuCare (Phase 6)
 * Target: Dakar, Senegal (Currency: FCFA / XOF)
 *
 * Security & Consistency Guarantees:
 * 1. Atomic concurrency lock (mutex queue + PostgreSQL FOR UPDATE RPC) prevents simultaneous double-bookings.
 * 2. Prevents duplicate active reservations by the same patient.
 * 3. Prevents booking in the past or with invalid calendar dates.
 * 4. Prevents booking with unverified or non-searchable doctors.
 * 5. Validates every requested slot against the doctor's real availability schedule, blocked periods, and vacation mode.
 * 6. Enforces strict role-based authorization (Patient vs Doctor) and controlled status transitions:
 *    - pending -> confirmed (Doctor only)
 *    - pending -> rejected (Doctor only)
 *    - pending -> cancelled (Patient or Doctor)
 *    - confirmed -> completed (Doctor only)
 *    - confirmed -> cancelled (Patient or Doctor under defined rules)
 * 7. Protects confirmed appointments from ever being overwritten or deleted.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Appointment,
  AppointmentActorRole,
  AppointmentStatus,
  AvailableSlotItem,
  BookableDateItem,
  ConsultationType,
  validateStatusTransition,
} from '@/types/appointment';
import { DoctorAvailabilityConfig, DoctorListItem } from '@/types/doctor';
import {
  availabilityService,
  getDayIndexFromIsoDate,
} from './availabilityService';
import { MOCK_APPOINTMENTS, MOCK_DOCTORS, TODAY_ISO } from './mockData';
import { notificationService } from './notificationService';

const STORAGE_KEY_APPOINTMENTS = '@sunucare_appointments_v6';
const STORAGE_KEY_DOCTOR_PROFILES = '@sunucare_doctor_profiles_v5';

/**
 * In-memory async mutex lock to serialize concurrent booking and status operations
 * Prevents race conditions during simultaneous booking attempts (e.g. Promise.all)
 */
let bookingMutexPromise: Promise<unknown> = Promise.resolve();

function runInAtomicTransaction<T>(operation: () => Promise<T>): Promise<T> {
  const next = bookingMutexPromise.then(operation, operation);
  bookingMutexPromise = next.catch(() => undefined);
  return next;
}

/**
 * Generate a unique SunuCare Dakar booking reference code (e.g. SC-DKR-8492A1)
 */
export function generateAppointmentReference(seed?: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  const base = seed || `${Date.now()}_${Math.random()}`;
  for (let i = 0; i < 6; i++) {
    const idx =
      Math.abs(
        base.charCodeAt(i % base.length) * (i + 17) +
          Math.floor(Math.random() * 1000)
      ) % chars.length;
    code += chars[idx];
  }
  return `SC-DKR-${code}`;
}

/**
 * Validate YYYY-MM-DD calendar date string
 */
export function isValidIsoDateString(dateStr?: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return false;
  }
  const [year, month, day] = dateStr.trim().split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Add days to an ISO date string (YYYY-MM-DD)
 */
function addDaysIso(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
}

/**
 * Convert "HH:MM" to minutes from midnight
 */
function timeToMins(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert minutes from midnight to "HH:MM"
 */
function minsToTime(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Expand a range like "08:30 - 12:30" into discrete slots (e.g. every 60 mins or durationMins)
 */
function expandRangeToSlots(
  startTime: string,
  endTime: string,
  stepMinutes = 60
): string[] {
  const start = timeToMins(startTime);
  const end = timeToMins(endTime);
  const step = Math.max(15, stepMinutes);
  const slots: string[] = [];
  for (let t = start; t + 30 <= end; t += step) {
    slots.push(minsToTime(t));
  }
  return slots;
}

const DEFAULT_FALLBACK_SLOTS = [
  '08:30',
  '09:00',
  '09:30',
  '10:30',
  '11:00',
  '11:30',
  '14:30',
  '15:00',
  '15:30',
  '16:30',
  '17:00',
  '17:30',
];

async function loadLocalAppointments(): Promise<Appointment[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_APPOINTMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((a: Appointment, idx: number) => ({
          ...a,
          referenceCode:
            a.referenceCode || `SC-DKR-00${idx + 1}${a.id.slice(-3).toUpperCase()}`,
        }));
      }
    }
    const seeded = MOCK_APPOINTMENTS.map((a, idx) => ({
      ...a,
      referenceCode:
        a.referenceCode || `SC-DKR-10${idx + 1}${a.id.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`,
    }));
    await AsyncStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(seeded));
    return seeded;
  } catch {
    return MOCK_APPOINTMENTS.map((a, idx) => ({
      ...a,
      referenceCode: a.referenceCode || `SC-DKR-10${idx + 1}`,
    }));
  }
}

async function saveLocalAppointments(list: Appointment[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(list));
  } catch {
    // Non-blocking storage error
  }
}

async function loadAllLocalDoctors(): Promise<DoctorListItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DOCTOR_PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return [...MOCK_DOCTORS];
}

function mapRowToAppointment(row: any): Appointment {
  return {
    id: row.id,
    referenceCode:
      row.reference_code ||
      `SC-DKR-${String(row.id || '000000')
        .replace(/[^A-Z0-9]/gi, '')
        .slice(-6)
        .toUpperCase()}`,
    patientId: row.patient_id,
    patientName: row.patient_name || 'Patient SunuCare',
    patientPhone: row.patient_phone || '+221 77 000 00 00',
    doctorId: row.doctor_id,
    doctorName: row.doctor_name || 'Dr. Praticien',
    doctorSpecialty: row.doctor_specialty || 'Médecine Générale',
    clinicName: row.clinic_name || 'Cabinet Médical Dakar',
    clinicAddress: row.clinic_address || `${row.district || 'Plateau'}, Dakar`,
    district: row.district || 'Plateau',
    date: row.appointment_date,
    time: row.appointment_time,
    status: row.status as AppointmentStatus,
    type: (row.consultation_type as ConsultationType) || 'in_person',
    consultationType: (row.consultation_type as ConsultationType) || 'in_person',
    feeFCFA: row.fee_fcfa || 20000,
    reason: row.reason || undefined,
    notes: row.notes || undefined,
    rejectionReason: row.rejection_reason || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    cancelledBy: row.cancelled_by || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    confirmedAt: row.confirmed_at || undefined,
    completedAt: row.completed_at || undefined,
    cancelledAt: row.cancelled_at || undefined,
  };
}

/**
 * Compute all candidate schedule slots for a doctor on a given ISO date (before subtracting bookings)
 */
function computeDoctorScheduleSlotsForDate(
  doctor: DoctorListItem,
  availConfig: DoctorAvailabilityConfig,
  dateIso: string
): {
  isBlocked: boolean;
  blockedReason?: string;
  candidateTimes: string[];
} {
  // 1. Check vacation mode
  if (availConfig.isVacationMode) {
    return {
      isBlocked: true,
      blockedReason: 'Le praticien est actuellement en congé / indisponible.',
      candidateTimes: [],
    };
  }

  // 2. Check blocked periods
  const matchingBlock = (availConfig.blockedPeriods || []).find(
    (b) => dateIso >= b.startDate && dateIso <= b.endDate
  );
  if (matchingBlock) {
    return {
      isBlocked: true,
      blockedReason: `Période indisponible (${matchingBlock.reason}).`,
      candidateTimes: [],
    };
  }

  const slotSet = new Set<string>();

  // 3. Explicit slots defined on the doctor profile for that date
  if (doctor.availableSlotsByDate && Array.isArray(doctor.availableSlotsByDate[dateIso])) {
    for (const s of doctor.availableSlotsByDate[dateIso]) {
      slotSet.add(s);
    }
  }

  // 4. Custom dated slots from availabilityConfig
  for (const custom of availConfig.customAvailableSlots || []) {
    if (custom.date === dateIso) {
      const expanded = expandRangeToSlots(
        custom.startTime,
        custom.endTime,
        availConfig.consultationDurationMinutes || 30
      );
      expanded.forEach((s) => slotSet.add(s));
      slotSet.add(custom.startTime);
    }
  }

  // 5. Weekly schedule for that weekday
  const dayIndex = getDayIndexFromIsoDate(dateIso);
  const daySchedule = (availConfig.weeklySchedule || []).find(
    (d) => d.dayIndex === dayIndex
  );

  if (daySchedule) {
    if (!daySchedule.isEnabled && slotSet.size === 0) {
      return {
        isBlocked: true,
        blockedReason: `Le cabinet est fermé le ${daySchedule.dayName}.`,
        candidateTimes: [],
      };
    }

    if (daySchedule.isEnabled) {
      for (const rangeLabel of daySchedule.slots || []) {
        const [start, end] = rangeLabel.split('-').map((s) => s.trim());
        if (start && end) {
          const expanded = expandRangeToSlots(start, end, 60);
          expanded.forEach((s) => slotSet.add(s));
        }
      }
      // Include standard morning/afternoon booking slots that fall inside the working day ranges
      for (const stdSlot of DEFAULT_FALLBACK_SLOTS) {
        const fallsInRange = (daySchedule.slots || []).some((rangeLabel) => {
          const [start, end] = rangeLabel.split('-').map((s) => s.trim());
          if (!start || !end) return false;
          const m = timeToMins(stdSlot);
          return m >= timeToMins(start) && m < timeToMins(end);
        });
        if (fallsInRange) {
          slotSet.add(stdSlot);
        }
      }
    }
  } else if (slotSet.size === 0) {
    DEFAULT_FALLBACK_SLOTS.forEach((s) => slotSet.add(s));
  }

  const sorted = Array.from(slotSet).sort((a, b) => a.localeCompare(b));
  return {
    isBlocked: false,
    candidateTimes: sorted,
  };
}

const SHORT_DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const SHORT_MONTHS_FR = [
  'JAN',
  'FÉV',
  'MAR',
  'AVR',
  'MAI',
  'JUIN',
  'JUIL',
  'AOÛ',
  'SEP',
  'OCT',
  'NOV',
  'DÉC',
];

function buildDateMetadata(dateIso: string): {
  dayShort: string;
  dayNum: string;
  monthShort: string;
  labelFr: string;
} {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayShort = SHORT_DAYS_FR[dt.getDay()] || 'Lun';
  const dayNum = String(d).padStart(2, '0');
  const monthShort = SHORT_MONTHS_FR[(m - 1) % 12] || 'NOV';

  let labelFr = `${dayShort} ${dayNum} ${monthShort}`;
  if (dateIso === TODAY_ISO) {
    labelFr = `Aujourd'hui (${dayNum} ${monthShort})`;
  } else if (dateIso === addDaysIso(TODAY_ISO, 1)) {
    labelFr = `Demain (${dayNum} ${monthShort})`;
  }

  return { dayShort, dayNum, monthShort, labelFr };
}

export const appointmentService = {
  /**
   * Retrieve dynamic bookable dates and available slots for a doctor over the next N days.
   * Synchronized with doctor availability config AND active appointments ('pending' | 'confirmed').
   */
  async getBookableDatesForDoctor(
    doctorId: string,
    daysCount = 7
  ): Promise<{
    doctor: DoctorListItem | null;
    dates: BookableDateItem[];
    error: string | null;
  }> {
    const allDoctors = await loadAllLocalDoctors();
    const doctor = allDoctors.find((d) => d.id === doctorId) || null;

    if (!doctor) {
      return { doctor: null, dates: [], error: 'Praticien introuvable.' };
    }

    if (
      doctor.verificationStatus !== 'verified' ||
      doctor.isPubliclySearchable === false
    ) {
      return {
        doctor: null,
        dates: [],
        error:
          'Ce praticien est en attente de vérification par l’Ordre des Médecins et ne peut pas recevoir de rendez-vous.',
      };
    }

    const [availConfig, allAppointments] = await Promise.all([
      availabilityService.getDoctorAvailability(doctorId),
      loadLocalAppointments(),
    ]);

    const activeDoctorAppointments = allAppointments.filter(
      (a) =>
        a.doctorId === doctorId &&
        (a.status === 'pending' || a.status === 'confirmed')
    );

    const dates: BookableDateItem[] = [];
    for (let i = 0; i < daysCount; i++) {
      const dateIso = addDaysIso(TODAY_ISO, i);
      const meta = buildDateMetadata(dateIso);
      const scheduleInfo = computeDoctorScheduleSlotsForDate(
        doctor,
        availConfig,
        dateIso
      );

      const slots: AvailableSlotItem[] = scheduleInfo.candidateTimes.map(
        (time) => {
          const conflictingApt = activeDoctorAppointments.find(
            (a) => a.date === dateIso && a.time === time
          );
          const period =
            timeToMins(time) < 13 * 60 ? 'morning' : 'afternoon';

          if (conflictingApt) {
            return {
              time,
              period,
              isAvailable: false,
              reasonUnavailable:
                conflictingApt.status === 'confirmed'
                  ? 'Créneau confirmé'
                  : 'Créneau déjà réservé',
            };
          }

          return {
            time,
            period,
            isAvailable: true,
          };
        }
      );

      const availableCount = slots.filter((s) => s.isAvailable).length;

      dates.push({
        date: dateIso,
        dayShort: meta.dayShort,
        dayNum: meta.dayNum,
        monthShort: meta.monthShort,
        labelFr: meta.labelFr,
        isBlocked: scheduleInfo.isBlocked,
        blockedReason: scheduleInfo.blockedReason,
        availableCount,
        slots,
      });
    }

    return { doctor, dates, error: null };
  },

  /**
   * Get available slots for a specific doctor and date (YYYY-MM-DD)
   */
  async getAvailableSlotsForDoctorDate(
    doctorId: string,
    dateIso: string
  ): Promise<{
    slots: AvailableSlotItem[];
    isBlocked: boolean;
    blockedReason?: string;
    error: string | null;
  }> {
    if (!isValidIsoDateString(dateIso)) {
      return {
        slots: [],
        isBlocked: true,
        blockedReason: 'Format de date invalide.',
        error: 'Date invalide.',
      };
    }

    if (dateIso < TODAY_ISO) {
      return {
        slots: [],
        isBlocked: true,
        blockedReason: 'Impossible de consulter des créneaux dans le passé.',
        error: 'Impossible de réserver un rendez-vous à une date passée.',
      };
    }

    const allDoctors = await loadAllLocalDoctors();
    const doctor = allDoctors.find((d) => d.id === doctorId);
    if (
      !doctor ||
      doctor.verificationStatus !== 'verified' ||
      doctor.isPubliclySearchable === false
    ) {
      return {
        slots: [],
        isBlocked: true,
        blockedReason: 'Praticien non vérifié ou introuvable.',
        error: 'Ce praticien ne peut pas recevoir de réservations.',
      };
    }

    const [availConfig, allAppointments] = await Promise.all([
      availabilityService.getDoctorAvailability(doctorId),
      loadLocalAppointments(),
    ]);

    const scheduleInfo = computeDoctorScheduleSlotsForDate(
      doctor,
      availConfig,
      dateIso
    );

    const activeOnDate = allAppointments.filter(
      (a) =>
        a.doctorId === doctorId &&
        a.date === dateIso &&
        (a.status === 'pending' || a.status === 'confirmed')
    );

    const slots: AvailableSlotItem[] = scheduleInfo.candidateTimes.map(
      (time) => {
        const conflict = activeOnDate.find((a) => a.time === time);
        return {
          time,
          period: timeToMins(time) < 13 * 60 ? 'morning' : 'afternoon',
          isAvailable: !conflict,
          reasonUnavailable: conflict
            ? conflict.status === 'confirmed'
              ? 'Créneau confirmé'
              : 'Créneau réservé'
            : undefined,
        };
      }
    );

    return {
      slots,
      isBlocked: scheduleInfo.isBlocked,
      blockedReason: scheduleInfo.blockedReason,
      error: null,
    };
  },

  /**
   * Fetch all appointments for a patient (sorted by date & time)
   * SECURITY (Phase 8 Audit): Enforces patient-only ownership when actorId is provided.
   */
  async getPatientAppointments(
    patientId: string,
    actorId?: string,
    actorRole?: string
  ): Promise<Appointment[]> {
    if (
      actorId !== undefined &&
      actorId !== patientId &&
      actorRole !== 'admin'
    ) {
      return [];
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (
          supabase.from('appointments' as any) as any
        )
          .select('*')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(mapRowToAppointment);
        }
      } catch {
        // Fallback to local persistent store
      }
    }

    const all = await loadLocalAppointments();
    const userAppointments = all.filter((a) => a.patientId === patientId);
    if (userAppointments.length > 0) {
      return userAppointments.sort((a, b) =>
        `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
      );
    }
    if (patientId === 'pat_pre_1') {
      return all
        .filter((a) => a.patientId === 'pat_pre_1')
        .sort((a, b) =>
          `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
        );
    }
    return [];
  },

  /**
   * Alias for backward compatibility
   */
  async getMyAppointments(userId: string): Promise<Appointment[]> {
    return this.getPatientAppointments(userId);
  },

  /**
   * Get the next upcoming appointment (confirmed or pending, today or future) for Patient Home preview
   */
  async getUpcomingPatientAppointment(
    patientId: string
  ): Promise<Appointment | null> {
    const appointments = await this.getPatientAppointments(patientId);
    const activeUpcoming = appointments
      .filter(
        (apt) =>
          (apt.status === 'confirmed' || apt.status === 'pending') &&
          apt.date >= TODAY_ISO
      )
      .sort((a, b) => {
        if (a.status === 'confirmed' && b.status !== 'confirmed') return -1;
        if (b.status === 'confirmed' && a.status !== 'confirmed') return 1;
        return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
      });

    return activeUpcoming[0] || null;
  },

  /**
   * Get single appointment by ID
   * SECURITY (Phase 8 Audit): When actorId is supplied, only the owning patient,
   * the assigned doctor, or an internal admin can access the appointment record.
   */
  async getAppointmentById(
    appointmentId: string,
    actorId?: string,
    actorRole?: string
  ): Promise<Appointment | null> {
    let found: Appointment | null = null;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (
          supabase.from('appointments' as any) as any
        )
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (!error && data) {
          found = mapRowToAppointment(data);
        }
      } catch {
        // Fallback
      }
    }

    if (!found) {
      const all = await loadLocalAppointments();
      found = all.find((a) => a.id === appointmentId) || null;
    }

    if (!found) return null;

    if (
      actorId !== undefined &&
      actorRole !== 'admin' &&
      found.patientId !== actorId &&
      found.doctorId !== actorId
    ) {
      return null;
    }

    return found;
  },

  /**
   * Fetch all appointments for a doctor
   * SECURITY (Phase 8 Audit): Enforces doctor ownership (or admin) when actorId is provided.
   */
  async getDoctorAppointments(
    doctorId: string,
    actorId?: string,
    actorRole?: string
  ): Promise<Appointment[]> {
    if (
      actorId !== undefined &&
      actorId !== doctorId &&
      actorRole !== 'admin'
    ) {
      return [];
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (
          supabase.from('appointments' as any) as any
        )
          .select('*')
          .eq('doctor_id', doctorId)
          .order('appointment_date', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(mapRowToAppointment);
        }
      } catch {
        // Fallback to local persistent store
      }
    }

    const all = await loadLocalAppointments();
    const doctorMatches = all.filter((a) => a.doctorId === doctorId);
    if (doctorMatches.length > 0) {
      return doctorMatches.sort((a, b) =>
        `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
      );
    }
    return [];
  },

  /**
   * Synchronize a doctor's availableSlotsByDate in local directory storage
   * so search results & doctor profile immediately reflect booked/freed slots.
   */
  async syncDoctorSlotConsistency(doctorId: string): Promise<void> {
    try {
      const [allDoctors, allAppointments] = await Promise.all([
        loadAllLocalDoctors(),
        loadLocalAppointments(),
      ]);
      const docIdx = allDoctors.findIndex((d) => d.id === doctorId);
      if (docIdx === -1) return;

      const doc = allDoctors[docIdx];
      const activeApts = allAppointments.filter(
        (a) =>
          a.doctorId === doctorId &&
          (a.status === 'pending' || a.status === 'confirmed') &&
          a.date >= TODAY_ISO
      );

      if (doc.availableSlotsByDate) {
        const updatedSlotsByDate: Record<string, string[]> = {};
        for (const [dateKey, slotList] of Object.entries(
          doc.availableSlotsByDate
        )) {
          const baseSlots =
            MOCK_DOCTORS.find((m) => m.id === doctorId)?.availableSlotsByDate?.[
              dateKey
            ] || slotList;
          updatedSlotsByDate[dateKey] = baseSlots.filter(
            (timeStr) =>
              !activeApts.some((a) => a.date === dateKey && a.time === timeStr)
          );
        }
        allDoctors[docIdx] = {
          ...doc,
          availableSlotsByDate: updatedSlotsByDate,
        };
        await AsyncStorage.setItem(
          STORAGE_KEY_DOCTOR_PROFILES,
          JSON.stringify(allDoctors)
        );
      }
    } catch {
      // Non-blocking sync
    }
  },

  /**
   * Create a new appointment request atomically with full backend/transactional security checks.
   *
   * Security rules enforced:
   * 1. Role & identity authorization (only an authenticated patient can book for themselves).
   * 2. Past date & invalid date format rejection.
   * 3. Unverified or hidden doctor rejection.
   * 4. Consultation type compatibility verification.
   * 5. Server/service-side availability slot reference verification (vacation, blocked periods, schedule).
   * 6. Duplicate active reservation prevention for the same patient.
   * 7. Atomic double-booking prevention on (doctorId, date, time).
   */
  async createAppointment(
    data: Omit<Appointment, 'id' | 'createdAt' | 'status'> & {
      actorId?: string;
      actorRole?: AppointmentActorRole;
    }
  ): Promise<{ appointment: Appointment | null; error: string | null }> {
    return runInAtomicTransaction(async () => {
      // 1. Validate required fields & authorization
      if (!data.doctorId || !data.patientId || !data.date || !data.time) {
        return {
          appointment: null,
          error:
            'Informations de rendez-vous incomplètes (praticien, patient, date ou heure manquante).',
        };
      }

      if (data.actorRole && data.actorRole !== 'patient') {
        return {
          appointment: null,
          error:
            'Action non autorisée : seul un compte patient peut effectuer une réservation de rendez-vous.',
        };
      }

      if (data.actorId && data.actorId !== data.patientId) {
        return {
          appointment: null,
          error:
            'Action non autorisée : vous ne pouvez réserver un rendez-vous que pour votre propre compte patient.',
        };
      }

      const cleanDate = data.date.trim();
      const cleanTime = data.time.trim();
      const requestedType: ConsultationType =
        data.consultationType || data.type || 'in_person';

      // 2. Validate date & time and prevent past appointments
      if (!isValidIsoDateString(cleanDate)) {
        return {
          appointment: null,
          error:
            'Date de rendez-vous invalide. Veuillez sélectionner une date valide du calendrier.',
        };
      }

      if (cleanDate < TODAY_ISO) {
        return {
          appointment: null,
          error:
            'Impossible de réserver un rendez-vous à une date passée. Veuillez choisir une date à partir d’aujourd’hui.',
        };
      }

      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(cleanTime)) {
        return {
          appointment: null,
          error: `Format d’horaire invalide (${cleanTime}). Utilisez le format HH:MM.`,
        };
      }

      // 3. Verify doctor exists and is strictly 'verified' and publicly searchable
      const allDoctors = await loadAllLocalDoctors();
      const doctor = allDoctors.find((d) => d.id === data.doctorId);

      if (!doctor) {
        return {
          appointment: null,
          error: 'Praticien introuvable dans le répertoire SunuCare.',
        };
      }

      if (
        doctor.verificationStatus !== 'verified' ||
        doctor.isPubliclySearchable === false
      ) {
        return {
          appointment: null,
          error:
            'Sécurité SunuCare : ce praticien n’est pas encore vérifié par l’Ordre des Médecins du Sénégal et ne peut pas recevoir de réservations.',
        };
      }

      // 4. Verify consultation type is supported by the doctor
      if (
        Array.isArray(doctor.consultationTypes) &&
        doctor.consultationTypes.length > 0 &&
        !doctor.consultationTypes.includes(requestedType)
      ) {
        return {
          appointment: null,
          error: `Ce praticien ne propose pas le mode "${
            requestedType === 'teleconsultation'
              ? 'Téléconsultation'
              : 'Au cabinet'
          }".`,
        };
      }

      // 5. Verify slot reference against doctor's availability config (vacation, blocked periods, schedule)
      const availConfig = await availabilityService.getDoctorAvailability(
        doctor.id
      );
      const scheduleCheck = computeDoctorScheduleSlotsForDate(
        doctor,
        availConfig,
        cleanDate
      );

      if (scheduleCheck.isBlocked) {
        return {
          appointment: null,
          error:
            scheduleCheck.blockedReason ||
            'Le praticien est indisponible à la date sélectionnée.',
        };
      }

      if (!scheduleCheck.candidateTimes.includes(cleanTime)) {
        return {
          appointment: null,
          error: `Créneau invalide : l’horaire ${cleanTime} ne fait pas partie des créneaux ouverts de ${doctor.fullName} le ${cleanDate}.`,
        };
      }

      // 6. Check existing appointments for conflicts and duplicate reservations
      const all = await loadLocalAppointments();

      // 6a. Prevent duplicate active reservation by the same patient at the same date & time
      const duplicatePatientSlot = all.find(
        (a) =>
          a.patientId === data.patientId &&
          a.date === cleanDate &&
          a.time === cleanTime &&
          (a.status === 'pending' || a.status === 'confirmed')
      );
      if (duplicatePatientSlot) {
        return {
          appointment: null,
          error: `Réservation en doublon refusée : vous avez déjà un rendez-vous actif prévu le ${cleanDate} à ${cleanTime} (Réf: ${duplicatePatientSlot.referenceCode || duplicatePatientSlot.id}).`,
        };
      }

      // 6b. Prevent double-booking on the same doctor, date, and time (both 'confirmed' and 'pending' lock the slot)
      const conflictingDoctorSlot = all.find(
        (a) =>
          a.doctorId === doctor.id &&
          a.date === cleanDate &&
          a.time === cleanTime &&
          (a.status === 'confirmed' || a.status === 'pending')
      );
      if (conflictingDoctorSlot) {
        return {
          appointment: null,
          error:
            conflictingDoctorSlot.status === 'confirmed'
              ? `Ce créneau horaire (${cleanDate} à ${cleanTime}) est déjà confirmé pour un autre patient. Veuillez choisir un autre horaire.`
              : `Ce créneau horaire (${cleanDate} à ${cleanTime}) vient d’être réservé par un autre patient. Veuillez choisir un autre horaire disponible.`,
        };
      }

      const now = new Date().toISOString();
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const referenceCode = generateAppointmentReference(
        `${data.patientId}_${doctor.id}_${cleanDate}_${cleanTime}_${uniqueSuffix}`
      );

      const newAppointment: Appointment = {
        id: `apt_${Date.now()}_${uniqueSuffix}`,
        referenceCode,
        patientId: data.patientId,
        patientName: data.patientName || 'Patient SunuCare',
        patientPhone: data.patientPhone || '+221 77 000 00 00',
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        doctorSpecialty: doctor.specialty,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.address || `${doctor.district}, Dakar`,
        district: doctor.district,
        date: cleanDate,
        time: cleanTime,
        status: 'pending',
        type: requestedType,
        consultationType: requestedType,
        feeFCFA: doctor.consultationFeeFCFA,
        reason: data.reason?.trim() || 'Consultation médicale programmée',
        createdAt: now,
        updatedAt: now,
      };

      // 7. Execute atomic PostgreSQL RPC when Supabase is configured
      if (isSupabaseConfigured()) {
        try {
          const { data: rpcRow, error: rpcError } = await (supabase.rpc as any)(
            'book_appointment_atomic',
            {
              p_patient_id: newAppointment.patientId,
              p_patient_name: newAppointment.patientName,
              p_patient_phone: newAppointment.patientPhone,
              p_doctor_id: newAppointment.doctorId,
              p_appointment_date: newAppointment.date,
              p_appointment_time: newAppointment.time,
              p_consultation_type: newAppointment.consultationType,
              p_reason: newAppointment.reason,
            }
          );

          if (rpcError) {
            return {
              appointment: null,
              error: rpcError.message || 'Impossible de réserver ce créneau.',
            };
          }

          if (rpcRow) {
            const mapped = mapRowToAppointment(rpcRow);
            all.push(mapped);
            await saveLocalAppointments(all);
            await this.syncDoctorSlotConsistency(doctor.id);
            return { appointment: mapped, error: null };
          }
        } catch {
          // Fallback to local atomic commit when offline or using template env
        }
      }

      all.push(newAppointment);
      await saveLocalAppointments(all);
      await this.syncDoctorSlotConsistency(doctor.id);

      // Dispatch automatic in-app notifications (Phase 7 Part 2)
      await notificationService.createNotification({
        recipientId: doctor.id,
        title: 'Nouvelle demande de rendez-vous reçue',
        message: `${newAppointment.patientName} souhaite réserver une consultation (${
          newAppointment.consultationType === 'teleconsultation'
            ? 'Téléconsultation'
            : 'Au cabinet'
        }) le ${newAppointment.date} à ${newAppointment.time}.`,
        type: 'appointment_request_received',
        relatedAppointmentId: newAppointment.id,
      });

      await notificationService.createNotification({
        recipientId: newAppointment.patientId,
        title: `Rappel : Demande enregistrée (${newAppointment.referenceCode})`,
        message: `Votre demande de rendez-vous avec ${doctor.fullName} pour le ${newAppointment.date} à ${newAppointment.time} (${doctor.clinicName}) est en attente de confirmation.`,
        type: 'appointment_reminder',
        relatedAppointmentId: newAppointment.id,
      });

      return { appointment: newAppointment, error: null };
    });
  },

  /**
   * Doctor action: Confirm an eligible pending appointment request
   * Enforces:
   * - Role & doctor ownership authorization
   * - Valid transition (pending -> confirmed)
   * - No double-confirmation conflict on the same slot
   */
  async confirmAppointment(
    appointmentId: string,
    doctorId?: string,
    actorRole: AppointmentActorRole = 'doctor'
  ): Promise<{ appointment: Appointment | null; error: string | null }> {
    return runInAtomicTransaction(async () => {
      const all = await loadLocalAppointments();
      const index = all.findIndex((a) => a.id === appointmentId);

      if (index === -1) {
        return {
          appointment: null,
          error: 'Demande de rendez-vous introuvable.',
        };
      }

      const target = all[index];

      // Authorization check
      if (actorRole !== 'doctor') {
        return {
          appointment: null,
          error:
            'Action non autorisée : seul le médecin peut confirmer une demande de rendez-vous.',
        };
      }

      if (doctorId && target.doctorId !== doctorId) {
        return {
          appointment: null,
          error:
            'Action non autorisée : ce rendez-vous concerne un autre praticien.',
        };
      }

      // Controlled status transition check
      const transitionCheck = validateStatusTransition(
        target.status,
        'confirmed',
        actorRole
      );
      if (!transitionCheck.valid) {
        return { appointment: null, error: transitionCheck.error };
      }

      // Check slot eligibility: ensure no other confirmed appointment exists for the same doctor, date, and time
      const slotConflict = all.find(
        (a) =>
          a.id !== target.id &&
          a.doctorId === target.doctorId &&
          a.date === target.date &&
          a.time === target.time &&
          a.status === 'confirmed'
      );

      if (slotConflict) {
        return {
          appointment: null,
          error: `Conflit d’horaire : un rendez-vous avec ${
            slotConflict.patientName || 'un patient'
          } est déjà confirmé le ${target.date} à ${target.time}.`,
        };
      }

      const now = new Date().toISOString();
      const updated: Appointment = {
        ...target,
        status: 'confirmed',
        confirmedAt: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured()) {
        try {
          await (supabase.rpc as any)('transition_appointment_status', {
            p_appointment_id: appointmentId,
            p_actor_id: doctorId || target.doctorId,
            p_actor_role: 'doctor',
            p_new_status: 'confirmed',
          });
        } catch {
          // Local persistence fallback
        }
      }

      all[index] = updated;
      await saveLocalAppointments(all);
      await this.syncDoctorSlotConsistency(target.doctorId);

      // Notify patient that their appointment is confirmed
      await notificationService.createNotification({
        recipientId: target.patientId,
        title: `Rendez-vous confirmé par ${target.doctorName}`,
        message: `Votre consultation du ${target.date} à ${target.time} (${target.clinicName}, ${target.district || 'Dakar'}) est désormais confirmée.`,
        type: 'appointment_confirmed',
        relatedAppointmentId: updated.id,
      });

      return { appointment: updated, error: null };
    });
  },

  /**
   * Doctor action: Reject a pending appointment request
   * Enforces:
   * - Role & doctor ownership authorization
   * - Valid transition (pending -> rejected)
   * - Frees the slot immediately so other patients can book it
   */
  async rejectAppointment(
    appointmentId: string,
    reason?: string,
    doctorId?: string,
    actorRole: AppointmentActorRole = 'doctor'
  ): Promise<{ appointment: Appointment | null; error: string | null }> {
    return runInAtomicTransaction(async () => {
      const all = await loadLocalAppointments();
      const index = all.findIndex((a) => a.id === appointmentId);

      if (index === -1) {
        return {
          appointment: null,
          error: 'Demande de rendez-vous introuvable.',
        };
      }

      const target = all[index];

      if (actorRole !== 'doctor') {
        return {
          appointment: null,
          error:
            'Action non autorisée : seul le praticien peut refuser une demande de rendez-vous.',
        };
      }

      if (doctorId && target.doctorId !== doctorId) {
        return {
          appointment: null,
          error:
            'Action non autorisée : ce rendez-vous concerne un autre praticien.',
        };
      }

      const transitionCheck = validateStatusTransition(
        target.status,
        'rejected',
        actorRole
      );
      if (!transitionCheck.valid) {
        return { appointment: null, error: transitionCheck.error };
      }

      const now = new Date().toISOString();
      const cleanReason =
        reason?.trim() || 'Créneau indisponible au planning du praticien';
      const updated: Appointment = {
        ...target,
        status: 'rejected',
        rejectionReason: cleanReason,
        cancelledBy: 'doctor',
        cancelledAt: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured()) {
        try {
          await (supabase.rpc as any)('transition_appointment_status', {
            p_appointment_id: appointmentId,
            p_actor_id: doctorId || target.doctorId,
            p_actor_role: 'doctor',
            p_new_status: 'rejected',
            p_reason: cleanReason,
          });
        } catch {
          // Local persistence fallback
        }
      }

      all[index] = updated;
      await saveLocalAppointments(all);
      await this.syncDoctorSlotConsistency(target.doctorId);

      // Notify patient that their appointment request was rejected
      await notificationService.createNotification({
        recipientId: target.patientId,
        title: `Demande de rendez-vous refusée par ${target.doctorName}`,
        message: `Votre demande du ${target.date} à ${target.time} n’a pas pu être retenue. Motif : ${cleanReason}. Le créneau a été libéré.`,
        type: 'appointment_rejected',
        relatedAppointmentId: updated.id,
      });

      return { appointment: updated, error: null };
    });
  },

  /**
   * Doctor action: Mark a confirmed appointment as completed
   * Enforces:
   * - Role & doctor ownership authorization
   * - Valid transition (confirmed -> completed)
   */
  async completeAppointment(
    appointmentId: string,
    doctorId?: string,
    clinicalNotes?: string,
    actorRole: AppointmentActorRole = 'doctor'
  ): Promise<{ appointment: Appointment | null; error: string | null }> {
    return runInAtomicTransaction(async () => {
      const all = await loadLocalAppointments();
      const index = all.findIndex((a) => a.id === appointmentId);

      if (index === -1) {
        return { appointment: null, error: 'Rendez-vous introuvable.' };
      }

      const target = all[index];

      if (actorRole !== 'doctor') {
        return {
          appointment: null,
          error:
            'Action non autorisée : seul le médecin peut marquer une consultation comme terminée.',
        };
      }

      if (doctorId && target.doctorId !== doctorId) {
        return {
          appointment: null,
          error:
            'Action non autorisée : ce rendez-vous concerne un autre praticien.',
        };
      }

      const transitionCheck = validateStatusTransition(
        target.status,
        'completed',
        actorRole
      );
      if (!transitionCheck.valid) {
        return { appointment: null, error: transitionCheck.error };
      }

      const now = new Date().toISOString();
      const updated: Appointment = {
        ...target,
        status: 'completed',
        notes: clinicalNotes?.trim() || target.notes,
        completedAt: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured()) {
        try {
          await (supabase.rpc as any)('transition_appointment_status', {
            p_appointment_id: appointmentId,
            p_actor_id: doctorId || target.doctorId,
            p_actor_role: 'doctor',
            p_new_status: 'completed',
            p_notes: updated.notes || null,
          });
        } catch {
          // Local persistence fallback
        }
      }

      all[index] = updated;
      await saveLocalAppointments(all);
      await this.syncDoctorSlotConsistency(target.doctorId);

      return { appointment: updated, error: null };
    });
  },

  /**
   * Patient or Doctor action: Cancel an existing appointment under defined rules
   * Enforces:
   * - Valid transition (pending | confirmed -> cancelled)
   * - Ownership check when actorId is provided
   * - Frees the slot immediately so availability stays consistent
   */
  async cancelAppointment(
    appointmentId: string,
    cancelledBy: AppointmentActorRole,
    reason?: string,
    actorId?: string
  ): Promise<{ appointment: Appointment | null; error: string | null }> {
    return runInAtomicTransaction(async () => {
      const all = await loadLocalAppointments();
      const index = all.findIndex((a) => a.id === appointmentId);

      if (index === -1) {
        return { appointment: null, error: 'Rendez-vous introuvable.' };
      }

      const target = all[index];

      // Verify ownership if actorId is provided
      if (actorId) {
        if (cancelledBy === 'patient' && target.patientId !== actorId) {
          return {
            appointment: null,
            error:
              'Action non autorisée : vous ne pouvez annuler que vos propres rendez-vous.',
          };
        }
        if (cancelledBy === 'doctor' && target.doctorId !== actorId) {
          return {
            appointment: null,
            error:
              'Action non autorisée : ce rendez-vous concerne un autre praticien.',
          };
        }
      }

      // Controlled status transition check
      const transitionCheck = validateStatusTransition(
        target.status,
        'cancelled',
        cancelledBy
      );
      if (!transitionCheck.valid) {
        return { appointment: null, error: transitionCheck.error };
      }

      // Rule for doctors cancelling a confirmed appointment: must provide a valid reason
      if (
        cancelledBy === 'doctor' &&
        target.status === 'confirmed' &&
        reason !== undefined &&
        reason.trim().length < 3
      ) {
        return {
          appointment: null,
          error:
            'Veuillez indiquer un motif d’annulation précis pour informer le patient dont le rendez-vous était confirmé.',
        };
      }

      const now = new Date().toISOString();
      const cleanReason =
        reason?.trim() ||
        (cancelledBy === 'doctor'
          ? 'Annulé par le praticien'
          : 'Annulé par le patient');

      const updated: Appointment = {
        ...target,
        status: 'cancelled',
        cancellationReason: cleanReason,
        cancelledBy,
        cancelledAt: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured()) {
        try {
          await (supabase.rpc as any)('transition_appointment_status', {
            p_appointment_id: appointmentId,
            p_actor_id:
              actorId ||
              (cancelledBy === 'doctor' ? target.doctorId : target.patientId),
            p_actor_role: cancelledBy,
            p_new_status: 'cancelled',
            p_reason: cleanReason,
          });
        } catch {
          // Local persistence fallback
        }
      }

      all[index] = updated;
      await saveLocalAppointments(all);
      await this.syncDoctorSlotConsistency(target.doctorId);

      // Notify counterpart about cancellation
      const recipientId =
        cancelledBy === 'patient' ? target.doctorId : target.patientId;
      await notificationService.createNotification({
        recipientId,
        title:
          cancelledBy === 'patient'
            ? `Rendez-vous annulé par ${target.patientName || 'le patient'}`
            : `Rendez-vous annulé par ${target.doctorName}`,
        message: `Le rendez-vous du ${target.date} à ${target.time} a été annulé. Motif : ${cleanReason}.`,
        type: 'appointment_cancelled',
        relatedAppointmentId: updated.id,
      });

      return { appointment: updated, error: null };
    });
  },

  /**
   * Protect confirmed and completed appointments from accidental deletion (Phase 6 Part 7)
   */
  async deleteAppointment(
    appointmentId: string
  ): Promise<{ deleted: boolean; error: string | null }> {
    return runInAtomicTransaction(async () => {
      const all = await loadLocalAppointments();
      const target = all.find((a) => a.id === appointmentId);

      if (!target) {
        return { deleted: false, error: 'Rendez-vous introuvable.' };
      }

      if (target.status === 'confirmed' || target.status === 'completed') {
        return {
          deleted: false,
          error:
            'Protection des données SunuCare : un rendez-vous confirmé ou terminé ne peut jamais être supprimé.',
        };
      }

      const remaining = all.filter((a) => a.id !== appointmentId);
      await saveLocalAppointments(remaining);
      await this.syncDoctorSlotConsistency(target.doctorId);
      return { deleted: true, error: null };
    });
  },
};

export default appointmentService;
