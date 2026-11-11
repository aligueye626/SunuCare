/**
 * Supabase Authentication Service for SunuCare
 * Roles: PATIENT, DOCTOR
 * Persistent session storage via AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AdminProfile,
  AuthUser,
  DoctorProfile,
  PatientProfile,
  RegisterData,
  UserRole,
} from '@/types/user';
import {
  getSupabaseAuthErrorMessage,
  isValidEmail,
  isValidSenegalPhone,
} from '@/utils/validators';
import { doctorService } from './doctorService';

const STORAGE_KEY_AUTH_USER = '@sunucare_auth_user';
const STORAGE_KEY_LOCAL_USERS = '@sunucare_local_registered_users';

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

export const authService = {
  /**
   * Register a new Patient or Doctor
   * SECURITY (Phase 7 Part 3): Public registration is strictly restricted to PATIENT and DOCTOR.
   * Admin privileges must NEVER be assigned via public registration.
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    if ((data as any)?.role !== 'patient' && (data as any)?.role !== 'doctor') {
      return {
        user: null,
        error:
          'Sécurité SunuCare : l’inscription publique est strictement réservée aux comptes Patient et Médecin. Le rôle ADMIN ne peut être attribué que par un processus serveur interne sécurisé.',
      };
    }

    // 1. Client-side Validations
    if (!data.firstName.trim() || !data.lastName.trim()) {
      return { user: null, error: 'Le prénom et le nom de famille sont obligatoires.' };
    }

    if (!isValidEmail(data.email)) {
      return { user: null, error: 'Veuillez saisir une adresse email valide.' };
    }

    if (!isValidSenegalPhone(data.phone)) {
      return {
        user: null,
        error:
          'Numéro de téléphone sénégalais invalide (+221 70/75/76/77/78/33 XXXXXXX requis).',
      };
    }

    if (!data.password || data.password.length < 6) {
      return { user: null, error: 'Le mot de passe doit comporter au moins 6 caractères.' };
    }

    if (data.password !== data.passwordConfirmation) {
      return { user: null, error: 'Les mots de passe ne correspondent pas.' };
    }

    if (data.role === 'doctor') {
      if (!data.specialty.trim()) {
        return { user: null, error: 'Veuillez sélectionner ou renseigner votre spécialité médicale.' };
      }
      if (!data.facilityName.trim()) {
        return { user: null, error: 'Le nom de votre clinique ou cabinet à Dakar est obligatoire.' };
      }
      if (!data.facilityDistrict.trim()) {
        return { user: null, error: 'Veuillez spécifier le quartier d’exercice à Dakar.' };
      }
    }

    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    const cleanEmail = data.email.trim().toLowerCase();

    // Prepare metadata
    const userMetadata: Record<string, any> = {
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      full_name: fullName,
      phone: data.phone.trim(),
      role: data.role,
    };

    if (data.role === 'doctor') {
      userMetadata.specialty = data.specialty.trim();
      userMetadata.license_number = data.licenseNumber?.trim() || '';
      userMetadata.facility_name = data.facilityName.trim();
      userMetadata.facility_address = data.facilityAddress.trim();
      userMetadata.facility_district = data.facilityDistrict.trim();
      userMetadata.professional_phone = data.professionalPhone?.trim() || data.phone.trim();
      // Requirement: Doctor registration must create an account with verification_status = pending
      // A pending doctor must not appear in public search results
      userMetadata.verification_status = 'pending';
      userMetadata.is_publicly_searchable = false;
    }

    // 2. Real Supabase Auth Execution (when valid credentials configured)
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password,
          options: {
            data: userMetadata,
          },
        });

        if (authError) {
          return { user: null, error: getSupabaseAuthErrorMessage(authError) };
        }

        if (!authData.user) {
          return { user: null, error: 'Erreur inattendue lors de la création du compte.' };
        }

        const now = new Date().toISOString();
        let appUser: AuthUser;

        if (data.role === 'doctor') {
          appUser = {
            id: authData.user.id,
            email: cleanEmail,
            role: 'doctor',
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            fullName,
            phone: data.phone.trim(),
            specialty: data.specialty.trim(),
            licenseNumber: data.licenseNumber?.trim(),
            facilityName: data.facilityName.trim(),
            facilityAddress: data.facilityAddress.trim(),
            facilityDistrict: data.facilityDistrict.trim(),
            professionalPhone: data.professionalPhone?.trim() || data.phone.trim(),
            verificationStatus: 'pending',
            isPubliclySearchable: false,
            consultationFeeFCFA: 20000,
            createdAt: now,
            updatedAt: now,
          };

          // Try syncing to database tables if they exist
          try {
            await (supabase.from('profiles' as any) as any).upsert({
              id: authData.user.id,
              email: cleanEmail,
              role: 'doctor',
              full_name: fullName,
              phone: data.phone.trim(),
              created_at: now,
              updated_at: now,
            });

            await (supabase.from('doctor_details' as any) as any).upsert({
              id: authData.user.id,
              specialty: data.specialty.trim(),
              license_number: data.licenseNumber?.trim() || '',
              verification_status: 'pending',
              clinic_name: data.facilityName.trim(),
              address: data.facilityAddress.trim(),
              district: data.facilityDistrict.trim(),
              city: 'Dakar',
              consultation_fee: 20000,
              experience_years: 0,
              is_publicly_searchable: false,
              rating: 5.0,
              review_count: 0,
              created_at: now,
            });
          } catch {
            // Table sync is non-blocking
          }
        } else {
          appUser = {
            id: authData.user.id,
            email: cleanEmail,
            role: 'patient',
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            fullName,
            phone: data.phone.trim(),
            createdAt: now,
            updatedAt: now,
          };

          try {
            await (supabase.from('profiles' as any) as any).upsert({
              id: authData.user.id,
              email: cleanEmail,
              role: 'patient',
              full_name: fullName,
              phone: data.phone.trim(),
              created_at: now,
              updated_at: now,
            });
          } catch {
            // Table sync is non-blocking
          }
        }

        await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(appUser));
        return { user: appUser, error: null };
      } catch (err: any) {
        return { user: null, error: getSupabaseAuthErrorMessage(err) };
      }
    }

    // 3. Robust Local Persistent Simulation (When developing with placeholder keys)
    try {
      const storedUsersRaw = await AsyncStorage.getItem(STORAGE_KEY_LOCAL_USERS);
      const localUsers: Array<{ email: string; password: string; user: AuthUser }> =
        storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      // Check duplicate email
      const existing = localUsers.find((u) => u.email === cleanEmail);
      if (existing) {
        return { user: null, error: 'Un compte existe déjà avec cette adresse email.' };
      }

      const generatedId = `user_${Date.now()}`;
      const now = new Date().toISOString();
      let appUser: AuthUser;

      if (data.role === 'doctor') {
        appUser = {
          id: generatedId,
          email: cleanEmail,
          role: 'doctor',
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          fullName,
          phone: data.phone.trim(),
          specialty: data.specialty.trim(),
          licenseNumber: data.licenseNumber?.trim(),
          facilityName: data.facilityName.trim(),
          facilityAddress: data.facilityAddress.trim(),
          facilityDistrict: data.facilityDistrict.trim(),
          professionalPhone: data.professionalPhone?.trim() || data.phone.trim(),
          verificationStatus: 'pending',
          isPubliclySearchable: false,
          consultationFeeFCFA: 20000,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        appUser = {
          id: generatedId,
          email: cleanEmail,
          role: 'patient',
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          fullName,
          phone: data.phone.trim(),
          createdAt: now,
          updatedAt: now,
        };
      }

      localUsers.push({ email: cleanEmail, password: data.password, user: appUser });
      await AsyncStorage.setItem(STORAGE_KEY_LOCAL_USERS, JSON.stringify(localUsers));
      await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(appUser));

      return { user: appUser, error: null };
    } catch (e: any) {
      return { user: null, error: e.message || 'Erreur lors de l’enregistrement.' };
    }
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    if (!email.trim() || !password.trim()) {
      return { user: null, error: 'Veuillez renseigner votre email et votre mot de passe.' };
    }

    if (!isValidEmail(email)) {
      return { user: null, error: 'Veuillez saisir une adresse email valide.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Real Supabase Auth Execution
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError) {
          return { user: null, error: getSupabaseAuthErrorMessage(authError) };
        }

        if (!authData.user) {
          return { user: null, error: 'Utilisateur non trouvé.' };
        }

        const meta = authData.user.user_metadata || {};
        const role: UserRole =
          meta.role === 'admin' && meta.assigned_by_server === true
            ? 'admin'
            : meta.role === 'doctor'
            ? 'doctor'
            : 'patient';
        const fullName = meta.full_name || cleanEmail.split('@')[0];
        const now = new Date().toISOString();

        let appUser: AuthUser;

        if (role === 'admin') {
          appUser = {
            id: authData.user.id,
            email: cleanEmail,
            role: 'admin',
            firstName: meta.first_name || 'Administrateur',
            lastName: meta.last_name || 'SunuCare',
            fullName,
            phone: meta.phone || '+221 33 889 90 00',
            department:
              meta.department ||
              'Direction Médicale & Conformité Ordre des Médecins',
            assignedByServer: true,
            createdAt: authData.user.created_at || now,
            updatedAt: now,
          };
        } else if (role === 'doctor') {
          appUser = {
            id: authData.user.id,
            email: cleanEmail,
            role: 'doctor',
            firstName: meta.first_name || '',
            lastName: meta.last_name || '',
            fullName,
            phone: meta.phone || '',
            specialty: meta.specialty || 'Médecine Générale',
            licenseNumber: meta.license_number,
            facilityName: meta.facility_name || 'Cabinet Médical',
            facilityAddress: meta.facility_address || 'Dakar',
            facilityDistrict: meta.facility_district || 'Plateau',
            professionalPhone: meta.professional_phone || meta.phone || '',
            verificationStatus: meta.verification_status || 'pending',
            isPubliclySearchable: meta.is_publicly_searchable === true,
            consultationFeeFCFA: meta.consultation_fee || 20000,
            createdAt: authData.user.created_at || now,
            updatedAt: now,
          };
        } else {
          appUser = {
            id: authData.user.id,
            email: cleanEmail,
            role: 'patient',
            firstName: meta.first_name || '',
            lastName: meta.last_name || '',
            fullName,
            phone: meta.phone || '',
            createdAt: authData.user.created_at || now,
            updatedAt: now,
          };
        }

        await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(appUser));
        return { user: appUser, error: null };
      } catch (err: any) {
        return { user: null, error: getSupabaseAuthErrorMessage(err) };
      }
    }

    // 2. Local Persistent Simulation
    try {
      const storedUsersRaw = await AsyncStorage.getItem(STORAGE_KEY_LOCAL_USERS);
      const localUsers: Array<{ email: string; password: string; user: AuthUser }> =
        storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      // Check pre-registered internal admin, doctor, or patient test accounts
      const existingStoredMatch = localUsers.find((u) => u.email === cleanEmail);

      if (cleanEmail === 'admin@sunucare.sn' && password === 'sunucare2026') {
        const adminTestUser: AdminProfile = {
          id: 'admin_pre_1',
          email: 'admin@sunucare.sn',
          role: 'admin',
          firstName: 'Abdoulaye Wade',
          lastName: 'Diallo',
          fullName: 'Pr. Abdoulaye Wade Diallo',
          phone: '+221 33 889 90 00',
          department: 'Direction Médicale & Conformité Ordre des Médecins',
          assignedByServer: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(adminTestUser));
        return { user: adminTestUser, error: null };
      }

      if (cleanEmail === 'doctor@sunucare.sn' && password === 'sunucare2026') {
        if (existingStoredMatch) {
          await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(existingStoredMatch.user));
          return { user: existingStoredMatch.user, error: null };
        }
        const doctorTestUser: DoctorProfile = {
          id: 'doc_pre_1',
          email: 'doctor@sunucare.sn',
          role: 'doctor',
          firstName: 'Aïssatou',
          lastName: 'Ndiaye',
          fullName: 'Dr. Aïssatou Ndiaye',
          phone: '+221 77 123 45 67',
          specialty: 'Cardiologie',
          subSpecialties: ['Échocardiographie', 'Hypertension artérielle', 'Cardiologie préventive'],
          licenseNumber: 'OM-SN-2012-0482',
          facilityName: 'Clinique du Cap',
          facilityAddress: 'Avenue Pasteur, Dakar Plateau',
          facilityDistrict: 'Plateau',
          professionalPhone: '+221 33 889 02 02',
          publicEmail: 'contact.ndiaye@cliniqueducap.sn',
          consultationTypes: ['in_person', 'teleconsultation'],
          bio: 'Cardiologue diplômée de l’UCAD et ancienne praticienne hospitalière à Dakar, spécialisée dans le suivi de l’hypertension artérielle et l’échocardiographie Doppler.',
          verificationStatus: 'verified',
          isPubliclySearchable: true,
          consultationFeeFCFA: 25000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(doctorTestUser));
        return { user: doctorTestUser, error: null };
      }

      if (cleanEmail === 'patient@sunucare.sn' && password === 'sunucare2026') {
        if (existingStoredMatch) {
          await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(existingStoredMatch.user));
          return { user: existingStoredMatch.user, error: null };
        }
        const patientTestUser: PatientProfile = {
          id: 'pat_pre_1',
          email: 'patient@sunucare.sn',
          role: 'patient',
          firstName: 'Fatou',
          lastName: 'Diop',
          fullName: 'Fatou Diop',
          phone: '+221 77 987 65 43',
          district: 'Mermoz',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(patientTestUser));
        return { user: patientTestUser, error: null };
      }

      const match = localUsers.find((u) => u.email === cleanEmail);
      if (!match) {
        return {
          user: null,
          error: 'Aucun compte trouvé avec cet email. Veuillez vous inscrire.',
        };
      }

      if (match.password !== password) {
        return {
          user: null,
          error: 'Mot de passe incorrect. Veuillez vérifier votre saisie.',
        };
      }

      await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(match.user));
      return { user: match.user, error: null };
    } catch (e: any) {
      return { user: null, error: e.message || 'Erreur lors de la connexion.' };
    }
  },

  /**
   * Reset password instructions
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (!email.trim() || !isValidEmail(email)) {
      return { success: false, message: 'Veuillez saisir une adresse email valide.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          return { success: false, message: getSupabaseAuthErrorMessage(error) };
        }
        return {
          success: true,
          message: 'Les instructions de réinitialisation ont été envoyées à votre adresse email.',
        };
      } catch (err: any) {
        return { success: false, message: getSupabaseAuthErrorMessage(err) };
      }
    }

    // Local simulation feedback
    return {
      success: true,
      message: `Un lien de réinitialisation a été préparé pour ${cleanEmail}.`,
    };
  },

  /**
   * Sign out & destroy session
   */
  async logout(): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch {
      // Continue to local wipe
    } finally {
      await AsyncStorage.removeItem(STORAGE_KEY_AUTH_USER);
    }
  },

  /**
   * Get active session user
   */
  async getCurrentSessionUser(): Promise<AuthUser | null> {
    try {
      // 1. If Supabase configured, check active Supabase session first
      if (isSupabaseConfigured()) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const stored = await AsyncStorage.getItem(STORAGE_KEY_AUTH_USER);
          if (stored) {
            return JSON.parse(stored);
          }
        }
      }

      // 2. Check persistent AsyncStorage
      const stored = await AsyncStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      return null;
    }
    return null;
  },

  /**
   * Update profile information safely
   * SECURITY RULE: Prevent users from changing their own account role or verification status through normal profile updates
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser | null> {
    const current = await this.getCurrentSessionUser();
    if (!current) return null;

    // Disallow role or verification_status or id modifications
    const {
      role: _r,
      verificationStatus: _v,
      isPubliclySearchable: _p,
      id: _id,
      ...allowedUpdates
    } = updates as any;

    // Recompute fullName if firstName or lastName changed
    const nextFirstName =
      typeof allowedUpdates.firstName === 'string' && allowedUpdates.firstName.trim()
        ? allowedUpdates.firstName.trim()
        : current.firstName;
    const nextLastName =
      typeof allowedUpdates.lastName === 'string' && allowedUpdates.lastName.trim()
        ? allowedUpdates.lastName.trim()
        : current.lastName;
    const nextFullName =
      allowedUpdates.fullName?.trim() ||
      (current.role === 'doctor'
        ? `Dr. ${nextFirstName} ${nextLastName}`
        : `${nextFirstName} ${nextLastName}`);

    const now = new Date().toISOString();

    const updatedUser: AuthUser = {
      ...current,
      ...allowedUpdates,
      firstName: nextFirstName,
      lastName: nextLastName,
      fullName: nextFullName,
      role: current.role,
      updatedAt: now,
    } as AuthUser;

    // Preserve doctor verificationStatus strictly
    if (current.role === 'doctor' && updatedUser.role === 'doctor') {
      updatedUser.verificationStatus = current.verificationStatus;
      updatedUser.isPubliclySearchable = current.isPubliclySearchable;
    }

    // 1. Sync to Supabase when configured
    if (isSupabaseConfigured()) {
      try {
        await (supabase.from('profiles' as any) as any).upsert({
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          full_name: updatedUser.fullName,
          phone: updatedUser.phone,
          avatar_url: updatedUser.avatarUrl || null,
          updated_at: now,
        });

        if (updatedUser.role === 'doctor') {
          await (supabase.from('doctor_details' as any) as any).upsert({
            id: updatedUser.id,
            specialty: updatedUser.specialty,
            sub_specialties: updatedUser.subSpecialties || [],
            clinic_name: updatedUser.facilityName,
            address: updatedUser.facilityAddress,
            district: updatedUser.facilityDistrict,
            city: 'Dakar',
            consultation_fee: updatedUser.consultationFeeFCFA,
            bio: updatedUser.bio || null,
            professional_phone: updatedUser.professionalPhone || updatedUser.phone,
            public_email: updatedUser.publicEmail || updatedUser.email,
            consultation_types: updatedUser.consultationTypes || ['in_person'],
          });
        }
      } catch {
        // Non-blocking fallback
      }
    }

    // 2. Sync to persistent AsyncStorage session and registered users store
    await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(updatedUser));

    try {
      const storedUsersRaw = await AsyncStorage.getItem(STORAGE_KEY_LOCAL_USERS);
      const localUsers: Array<{ email: string; password: string; user: AuthUser }> =
        storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      const idx = localUsers.findIndex(
        (u) => u.user.id === updatedUser.id || u.email === current.email.toLowerCase()
      );
      if (idx >= 0) {
        localUsers[idx] = {
          ...localUsers[idx],
          email: updatedUser.email.toLowerCase(),
          user: updatedUser,
        };
      } else {
        localUsers.push({
          email: updatedUser.email.toLowerCase(),
          password: 'sunucare2026',
          user: updatedUser,
        });
      }
      await AsyncStorage.setItem(STORAGE_KEY_LOCAL_USERS, JSON.stringify(localUsers));
    } catch {
      // Non-blocking
    }

    // 3. If doctor, sync public directory (while respecting verificationStatus)
    if (updatedUser.role === 'doctor') {
      await doctorService.syncDoctorProfileToDirectory(updatedUser);
    }

    return updatedUser;
  },
};

export default authService;
