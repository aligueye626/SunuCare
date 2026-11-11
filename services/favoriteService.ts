/**
 * Patient Favorites Service for SunuCare (Phase 7 — Part 1)
 *
 * Features:
 * - Add verified doctors to patient favorites
 * - Remove doctors from patient favorites
 * - View saved doctors & open saved doctor profiles
 * - Persist favorites in Supabase ('patient_favorites' table) with AsyncStorage sync
 * - Prevent duplicate entries strictly (Set deduplication + DB UNIQUE(patient_id, doctor_id))
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DoctorListItem } from '@/types/doctor';
import { MOCK_DOCTORS } from './mockData';

const STORAGE_KEY_FAVORITE_DOCTORS = '@sunucare_fav_doctors_';
const STORAGE_KEY_DOCTOR_PROFILES = '@sunucare_doctor_profiles_v5';

async function loadLocalDoctorsList(): Promise<DoctorListItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DOCTOR_PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return [...MOCK_DOCTORS];
}

function deduplicateIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

export const favoriteService = {
  /**
   * Retrieve deduplicated list of favorite doctor IDs for a patient
   */
  async getFavoriteDoctorIds(
    patientId: string,
    actorId?: string
  ): Promise<string[]> {
    if (!patientId) return [];
    if (actorId !== undefined && actorId !== patientId) {
      return [];
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (
          supabase.from('patient_favorites' as any) as any
        )
          .select('doctor_id')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const remoteIds = deduplicateIds(
            data.map((r: any) => String(r.doctor_id))
          );
          await AsyncStorage.setItem(
            `${STORAGE_KEY_FAVORITE_DOCTORS}${patientId}`,
            JSON.stringify(remoteIds)
          );
          return remoteIds;
        }
      } catch {
        // Fallback to local storage
      }
    }

    try {
      const raw = await AsyncStorage.getItem(
        `${STORAGE_KEY_FAVORITE_DOCTORS}${patientId}`
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const clean = deduplicateIds(parsed);
          return clean;
        }
      }

      const defaults =
        patientId === 'pat_pre_1'
          ? deduplicateIds(
              MOCK_DOCTORS.filter(
                (d) => d.verificationStatus === 'verified' && d.isFavorite
              ).map((d) => d.id)
            )
          : [];

      await AsyncStorage.setItem(
        `${STORAGE_KEY_FAVORITE_DOCTORS}${patientId}`,
        JSON.stringify(defaults)
      );
      return defaults;
    } catch {
      return patientId === 'pat_pre_1' ? ['doc_pre_1', 'doc-3'] : [];
    }
  },

  /**
   * Add a verified doctor to a patient's favorites.
   * Strictly prevents duplicate entries and rejects unverified doctors.
   */
  async addFavoriteDoctor(
    patientId: string,
    doctorId: string,
    actorId?: string
  ): Promise<{
    favoriteIds: string[];
    added: boolean;
    error: string | null;
  }> {
    if (!patientId || !doctorId) {
      return {
        favoriteIds: [],
        added: false,
        error: 'Identifiant patient et médecin requis.',
      };
    }

    if (actorId !== undefined && actorId !== patientId) {
      return {
        favoriteIds: [],
        added: false,
        error:
          'Accès refusé : vous ne pouvez modifier que votre propre liste de favoris.',
      };
    }

    // Verify target doctor exists and is verified
    const allDoctors = await loadLocalDoctorsList();
    const targetDoc = allDoctors.find((d) => d.id === doctorId);
    if (!targetDoc || targetDoc.verificationStatus !== 'verified') {
      return {
        favoriteIds: await this.getFavoriteDoctorIds(patientId),
        added: false,
        error:
          'Seuls les praticiens vérifiés peuvent être ajoutés à vos favoris.',
      };
    }

    const current = await this.getFavoriteDoctorIds(patientId);

    // Prevent duplicate entry
    if (current.includes(doctorId)) {
      return {
        favoriteIds: current,
        added: false,
        error: null, // Idempotent no-op, no duplicate created
      };
    }

    const updated = deduplicateIds([...current, doctorId]);

    if (isSupabaseConfigured()) {
      try {
        await (supabase.from('patient_favorites' as any) as any).upsert(
          {
            patient_id: patientId,
            doctor_id: doctorId,
          },
          { onConflict: 'patient_id,doctor_id', ignoreDuplicates: true }
        );
      } catch {
        // Local persistence fallback
      }
    }

    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEY_FAVORITE_DOCTORS}${patientId}`,
        JSON.stringify(updated)
      );
    } catch {
      // Non-blocking
    }

    return {
      favoriteIds: updated,
      added: true,
      error: null,
    };
  },

  /**
   * Remove a doctor from a patient's favorites
   */
  async removeFavoriteDoctor(
    patientId: string,
    doctorId: string,
    actorId?: string
  ): Promise<{
    favoriteIds: string[];
    removed: boolean;
    error: string | null;
  }> {
    if (!patientId || !doctorId) {
      return {
        favoriteIds: [],
        removed: false,
        error: 'Identifiant patient et médecin requis.',
      };
    }

    if (actorId !== undefined && actorId !== patientId) {
      return {
        favoriteIds: [],
        removed: false,
        error:
          'Accès refusé : vous ne pouvez modifier que votre propre liste de favoris.',
      };
    }

    const current = await this.getFavoriteDoctorIds(patientId);
    const existed = current.includes(doctorId);
    const updated = current.filter((id) => id !== doctorId);

    if (isSupabaseConfigured()) {
      try {
        await (supabase.from('patient_favorites' as any) as any)
          .delete()
          .eq('patient_id', patientId)
          .eq('doctor_id', doctorId);
      } catch {
        // Local persistence fallback
      }
    }

    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEY_FAVORITE_DOCTORS}${patientId}`,
        JSON.stringify(updated)
      );
    } catch {
      // Non-blocking
    }

    return {
      favoriteIds: updated,
      removed: existed,
      error: null,
    };
  },

  /**
   * Toggle a doctor in a patient's favorites (Add if not present, Remove if present)
   */
  async toggleFavoriteDoctor(
    patientId: string,
    doctorId: string
  ): Promise<string[]> {
    const current = await this.getFavoriteDoctorIds(patientId);
    if (current.includes(doctorId)) {
      const res = await this.removeFavoriteDoctor(patientId, doctorId);
      return res.favoriteIds;
    }
    const res = await this.addFavoriteDoctor(patientId, doctorId);
    return res.favoriteIds;
  },

  /**
   * Retrieve full DoctorListItem objects for all saved favorite doctors of a patient.
   * Only returns verified and active doctors.
   */
  async getSavedFavoriteDoctors(
    patientId: string,
    actorId?: string
  ): Promise<DoctorListItem[]> {
    if (actorId !== undefined && actorId !== patientId) {
      return [];
    }
    const [favIds, allDoctors] = await Promise.all([
      this.getFavoriteDoctorIds(patientId, actorId),
      loadLocalDoctorsList(),
    ]);

    const favSet = new Set(favIds);
    return allDoctors
      .filter(
        (doc) =>
          favSet.has(doc.id) &&
          doc.verificationStatus === 'verified' &&
          doc.isPubliclySearchable !== false
      )
      .map((doc) => ({
        ...doc,
        isFavorite: true,
      }));
  },
};

export default favoriteService;

