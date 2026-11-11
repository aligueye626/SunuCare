/**
 * Doctor Availability Service for SunuCare
 * Connects to Supabase 'doctor_availability' table with persistent AsyncStorage synchronization.
 *
 * CORE BUSINESS RULE:
 * Protect existing confirmed appointments!
 * - Cannot disable a working day if a future confirmed appointment falls on that day of the week.
 * - Cannot remove a time slot if a future confirmed appointment falls within that slot's window.
 * - Cannot remove a custom future slot if a confirmed appointment is booked on that date & time.
 * - Cannot block an unavailable period (date range) if a confirmed appointment exists within that period.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  BlockedPeriod,
  CustomAvailableSlot,
  DoctorAvailabilityConfig,
  DoctorWeeklySchedule,
} from '@/types/doctor';
import { Appointment } from '@/types/appointment';
import {
  MOCK_BLOCKED_PERIODS,
  MOCK_CUSTOM_SLOTS,
  MOCK_DOCTOR_SCHEDULE,
  TODAY_ISO,
} from './mockData';

const STORAGE_PREFIX_AVAILABILITY = '@sunucare_doctor_availability_v4_';

/**
 * Helper: Convert "YYYY-MM-DD" to SunuCare dayIndex (0 = Lundi ... 6 = Dimanche)
 */
export function getDayIndexFromIsoDate(isoDate: string): number {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return 0;
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const jsDay = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Helper: Convert "HH:MM" to minutes since midnight for interval comparison
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Check if an appointment time ("HH:MM") falls inside [startTime, endTime]
 */
function isTimeWithinSlot(aptTime: string, startTime: string, endTime: string): boolean {
  const aptMin = timeToMinutes(aptTime);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  return aptMin >= startMin && aptMin < endMin;
}

function createDefaultAvailability(doctorId: string): DoctorAvailabilityConfig {
  return {
    doctorId,
    consultationDurationMinutes: 30,
    isVacationMode: false,
    weeklySchedule: MOCK_DOCTOR_SCHEDULE.map((day) => ({
      ...day,
      slots: [...day.slots],
      slotRanges: day.slotRanges ? day.slotRanges.map((r) => ({ ...r })) : [],
    })),
    blockedPeriods: doctorId === 'doc_pre_1' ? [...MOCK_BLOCKED_PERIODS] : [],
    customAvailableSlots: doctorId === 'doc_pre_1' ? [...MOCK_CUSTOM_SLOTS] : [],
    updatedAt: new Date().toISOString(),
  };
}

async function saveAvailabilityConfig(
  config: DoctorAvailabilityConfig
): Promise<DoctorAvailabilityConfig> {
  const updated: DoctorAvailabilityConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      await (supabase.from('doctor_availability' as any) as any).upsert({
        doctor_id: updated.doctorId,
        consultation_duration_minutes: updated.consultationDurationMinutes,
        is_vacation_mode: updated.isVacationMode,
        weekly_schedule: updated.weeklySchedule,
        blocked_periods: updated.blockedPeriods,
        custom_available_slots: updated.customAvailableSlots,
        updated_at: updated.updatedAt,
      });
    } catch {
      // Non-blocking fallback to AsyncStorage
    }
  }

  try {
    await AsyncStorage.setItem(
      `${STORAGE_PREFIX_AVAILABILITY}${updated.doctorId}`,
      JSON.stringify(updated)
    );
  } catch {
    // Non-blocking
  }

  return updated;
}

export const availabilityService = {
  /**
   * Load doctor availability configuration from Supabase or persistent AsyncStorage
   */
  async getDoctorAvailability(doctorId: string): Promise<DoctorAvailabilityConfig> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase.from('doctor_availability' as any) as any)
          .select('*')
          .eq('doctor_id', doctorId)
          .single();

        if (!error && data) {
          const remoteConfig: DoctorAvailabilityConfig = {
            doctorId: data.doctor_id,
            consultationDurationMinutes: data.consultation_duration_minutes || 30,
            isVacationMode: Boolean(data.is_vacation_mode),
            weeklySchedule: Array.isArray(data.weekly_schedule)
              ? data.weekly_schedule
              : createDefaultAvailability(doctorId).weeklySchedule,
            blockedPeriods: Array.isArray(data.blocked_periods) ? data.blocked_periods : [],
            customAvailableSlots: Array.isArray(data.custom_available_slots)
              ? data.custom_available_slots
              : [],
            updatedAt: data.updated_at || new Date().toISOString(),
          };
          await AsyncStorage.setItem(
            `${STORAGE_PREFIX_AVAILABILITY}${doctorId}`,
            JSON.stringify(remoteConfig)
          );
          return remoteConfig;
        }
      } catch {
        // Fallback to AsyncStorage
      }
    }

    try {
      const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX_AVAILABILITY}${doctorId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignore parse error
    }

    const defaultConfig = createDefaultAvailability(doctorId);
    await saveAvailabilityConfig(defaultConfig);
    return defaultConfig;
  },

  /**
   * Set consultation duration (15, 20, 30, 45, 60 minutes)
   */
  async updateConsultationDuration(
    doctorId: string,
    durationMinutes: number
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    if (![15, 20, 30, 45, 60].includes(durationMinutes)) {
      return { config: null, error: 'Durée de consultation invalide.' };
    }

    const current = await this.getDoctorAvailability(doctorId);
    const updated = await saveAvailabilityConfig({
      ...current,
      consultationDurationMinutes: durationMinutes,
    });
    return { config: updated, error: null };
  },

  /**
   * Toggle working day on/off while protecting existing confirmed appointments
   */
  async toggleWorkingDay(
    doctorId: string,
    dayIndex: number,
    confirmedAppointments: Appointment[]
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const current = await this.getDoctorAvailability(doctorId);
    const targetDay = current.weeklySchedule.find((d) => d.dayIndex === dayIndex);

    if (!targetDay) {
      return { config: null, error: 'Jour introuvable dans le planning.' };
    }

    // If disabling a working day, verify no future confirmed appointment falls on this weekday
    if (targetDay.isEnabled) {
      const conflictingConfirmed = confirmedAppointments.filter(
        (apt) =>
          apt.status === 'confirmed' &&
          apt.date >= TODAY_ISO &&
          getDayIndexFromIsoDate(apt.date) === dayIndex
      );

      if (conflictingConfirmed.length > 0) {
        const firstConflict = conflictingConfirmed[0];
        return {
          config: null,
          error: `Protection des rendez-vous confirmés : impossible de désactiver le ${targetDay.dayName} car vous avez ${conflictingConfirmed.length} rendez-vous confirmé(s) (ex. ${firstConflict.patientName || 'Patient'} le ${firstConflict.date} à ${firstConflict.time}).`,
        };
      }
    }

    const updatedSchedule: DoctorWeeklySchedule[] = current.weeklySchedule.map((day) => {
      if (day.dayIndex !== dayIndex) return day;
      const nextEnabled = !day.isEnabled;
      return {
        ...day,
        isEnabled: nextEnabled,
        slots:
          nextEnabled && day.slots.length === 0
            ? ['09:00 - 12:30', '14:30 - 17:30']
            : day.slots,
        slotRanges:
          nextEnabled && (!day.slotRanges || day.slotRanges.length === 0)
            ? [
                { id: `sr_${dayIndex}_1`, startTime: '09:00', endTime: '12:30' },
                { id: `sr_${dayIndex}_2`, startTime: '14:30', endTime: '17:30' },
              ]
            : day.slotRanges,
      };
    });

    const updated = await saveAvailabilityConfig({
      ...current,
      weeklySchedule: updatedSchedule,
    });
    return { config: updated, error: null };
  },

  /**
   * Add a new available time slot to a working day
   */
  async addWeeklyTimeSlot(
    doctorId: string,
    dayIndex: number,
    startTime: string,
    endTime: string
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const cleanStart = startTime.trim();
    const cleanEnd = endTime.trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(cleanStart) || !timeRegex.test(cleanEnd)) {
      return {
        config: null,
        error: 'Format horaire invalide. Utilisez le format HH:MM (ex: 09:00 et 13:00).',
      };
    }

    if (timeToMinutes(cleanStart) >= timeToMinutes(cleanEnd)) {
      return {
        config: null,
        error: 'L’heure de fin doit être postérieure à l’heure de début.',
      };
    }

    const slotLabel = `${cleanStart} - ${cleanEnd}`;
    const current = await this.getDoctorAvailability(doctorId);

    const updatedSchedule = current.weeklySchedule.map((day) => {
      if (day.dayIndex !== dayIndex) return day;
      if (day.slots.includes(slotLabel)) return day;

      return {
        ...day,
        isEnabled: true,
        slots: [...day.slots, slotLabel],
        slotRanges: [
          ...(day.slotRanges || []),
          {
            id: `sr_${dayIndex}_${Date.now()}`,
            startTime: cleanStart,
            endTime: cleanEnd,
          },
        ],
      };
    });

    const updated = await saveAvailabilityConfig({
      ...current,
      weeklySchedule: updatedSchedule,
    });
    return { config: updated, error: null };
  },

  /**
   * Remove an available time slot from a working day while protecting confirmed appointments
   */
  async removeWeeklyTimeSlot(
    doctorId: string,
    dayIndex: number,
    slotIndex: number,
    confirmedAppointments: Appointment[]
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const current = await this.getDoctorAvailability(doctorId);
    const targetDay = current.weeklySchedule.find((d) => d.dayIndex === dayIndex);

    if (!targetDay || slotIndex < 0 || slotIndex >= targetDay.slots.length) {
      return { config: null, error: 'Créneau horaire introuvable.' };
    }

    const slotLabel = targetDay.slots[slotIndex];
    const [startStr, endStr] = slotLabel.split('-').map((s) => s.trim());

    // Protect existing confirmed appointments falling in this slot window on this day of the week
    if (startStr && endStr) {
      const conflictingConfirmed = confirmedAppointments.filter(
        (apt) =>
          apt.status === 'confirmed' &&
          apt.date >= TODAY_ISO &&
          getDayIndexFromIsoDate(apt.date) === dayIndex &&
          isTimeWithinSlot(apt.time, startStr, endStr)
      );

      if (conflictingConfirmed.length > 0) {
        const firstConflict = conflictingConfirmed[0];
        return {
          config: null,
          error: `Protection des rendez-vous confirmés : impossible de supprimer le créneau "${slotLabel}" du ${targetDay.dayName} car le rendez-vous de ${firstConflict.patientName || 'un patient'} (${firstConflict.date} à ${firstConflict.time}) est déjà confirmé sur cette plage.`,
        };
      }
    }

    const updatedSchedule = current.weeklySchedule.map((day) => {
      if (day.dayIndex !== dayIndex) return day;
      const nextSlots = day.slots.filter((_, i) => i !== slotIndex);
      const nextRanges = (day.slotRanges || []).filter((_, i) => i !== slotIndex);
      return {
        ...day,
        slots: nextSlots,
        slotRanges: nextRanges,
        isEnabled: nextSlots.length > 0 ? day.isEnabled : false,
      };
    });

    const updated = await saveAvailabilityConfig({
      ...current,
      weeklySchedule: updatedSchedule,
    });
    return { config: updated, error: null };
  },

  /**
   * Create a custom dated available time slot (ponctuel)
   */
  async addCustomAvailableSlot(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!dateRegex.test(date.trim())) {
      return {
        config: null,
        error: 'Date invalide. Utilisez le format AAAA-MM-JJ (ex: 2026-11-20).',
      };
    }

    if (date.trim() < TODAY_ISO) {
      return {
        config: null,
        error: 'Vous ne pouvez créer des créneaux disponibles que pour des dates futures ou aujourd’hui.',
      };
    }

    if (!timeRegex.test(startTime.trim()) || !timeRegex.test(endTime.trim())) {
      return {
        config: null,
        error: 'Format horaire invalide. Utilisez HH:MM (ex: 09:00 à 12:00).',
      };
    }

    if (timeToMinutes(startTime.trim()) >= timeToMinutes(endTime.trim())) {
      return {
        config: null,
        error: 'L’heure de fin doit être postérieure à l’heure de début.',
      };
    }

    const current = await this.getDoctorAvailability(doctorId);
    const newCustomSlot: CustomAvailableSlot = {
      id: `cslot_${Date.now()}`,
      doctorId,
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
    };

    const updated = await saveAvailabilityConfig({
      ...current,
      customAvailableSlots: [...current.customAvailableSlots, newCustomSlot],
    });

    return { config: updated, error: null };
  },

  /**
   * Remove a future custom available slot while protecting confirmed appointments
   */
  async removeCustomAvailableSlot(
    doctorId: string,
    slotId: string,
    confirmedAppointments: Appointment[]
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const current = await this.getDoctorAvailability(doctorId);
    const targetSlot = current.customAvailableSlots.find((s) => s.id === slotId);

    if (!targetSlot) {
      return { config: null, error: 'Créneau spécifique introuvable.' };
    }

    const conflictingConfirmed = confirmedAppointments.filter(
      (apt) =>
        apt.status === 'confirmed' &&
        apt.date === targetSlot.date &&
        isTimeWithinSlot(apt.time, targetSlot.startTime, targetSlot.endTime)
    );

    if (conflictingConfirmed.length > 0) {
      const first = conflictingConfirmed[0];
      return {
        config: null,
        error: `Protection des rendez-vous confirmés : impossible de retirer le créneau du ${targetSlot.date} (${targetSlot.startTime} - ${targetSlot.endTime}) car ${first.patientName || 'un patient'} a un rendez-vous confirmé à ${first.time}.`,
      };
    }

    const updated = await saveAvailabilityConfig({
      ...current,
      customAvailableSlots: current.customAvailableSlots.filter((s) => s.id !== slotId),
    });

    return { config: updated, error: null };
  },

  /**
   * Block an unavailable period (date range) while protecting existing confirmed appointments
   */
  async addBlockedPeriod(
    doctorId: string,
    startDate: string,
    endDate: string,
    reason: string,
    confirmedAppointments: Appointment[]
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const cleanStart = startDate.trim();
    const cleanEnd = endDate.trim();
    const cleanReason = reason.trim() || 'Indisponibilité professionnelle';

    if (!dateRegex.test(cleanStart) || !dateRegex.test(cleanEnd)) {
      return {
        config: null,
        error: 'Format de date invalide. Utilisez AAAA-MM-JJ (ex: 2026-12-01).',
      };
    }

    if (cleanStart > cleanEnd) {
      return {
        config: null,
        error: 'La date de fin de blocage doit être postérieure ou égale à la date de début.',
      };
    }

    // Protect existing confirmed appointments in [cleanStart, cleanEnd]
    const conflictingConfirmed = confirmedAppointments.filter(
      (apt) => apt.status === 'confirmed' && apt.date >= cleanStart && apt.date <= cleanEnd
    );

    if (conflictingConfirmed.length > 0) {
      const first = conflictingConfirmed[0];
      return {
        config: null,
        error: `Protection des rendez-vous confirmés : vous ne pouvez pas bloquer la période du ${cleanStart} au ${cleanEnd} car ${conflictingConfirmed.length} rendez-vous confirmé(s) y figurent (ex. ${first.patientName || 'Patient'} le ${first.date} à ${first.time}). Veuillez d’abord gérer ce rendez-vous.`,
      };
    }

    const current = await this.getDoctorAvailability(doctorId);
    const newBlock: BlockedPeriod = {
      id: `blk_${Date.now()}`,
      doctorId,
      startDate: cleanStart,
      endDate: cleanEnd,
      reason: cleanReason,
      createdAt: new Date().toISOString(),
    };

    const updated = await saveAvailabilityConfig({
      ...current,
      blockedPeriods: [...current.blockedPeriods, newBlock],
    });

    return { config: updated, error: null };
  },

  /**
   * Remove a blocked period
   */
  async removeBlockedPeriod(
    doctorId: string,
    blockedPeriodId: string
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const current = await this.getDoctorAvailability(doctorId);
    const updated = await saveAvailabilityConfig({
      ...current,
      blockedPeriods: current.blockedPeriods.filter((b) => b.id !== blockedPeriodId),
    });

    return { config: updated, error: null };
  },

  /**
   * Toggle vacation mode while informing about existing confirmed appointments
   */
  async toggleVacationMode(
    doctorId: string,
    isVacationMode: boolean
  ): Promise<{ config: DoctorAvailabilityConfig | null; error: string | null }> {
    const current = await this.getDoctorAvailability(doctorId);
    const updated = await saveAvailabilityConfig({
      ...current,
      isVacationMode,
    });
    return { config: updated, error: null };
  },
};

export default availabilityService;

