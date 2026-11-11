/**
 * Supabase Database Schema Definitions for SunuCare
 * Target: PostgreSQL via Supabase
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'patient' | 'doctor';
          first_name: string | null;
          last_name: string | null;
          full_name: string;
          phone: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'patient' | 'doctor';
          first_name?: string | null;
          last_name?: string | null;
          full_name: string;
          phone: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string;
          phone?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      doctor_details: {
        Row: {
          id: string;
          specialty: string;
          sub_specialties: string[] | null;
          license_number: string;
          verification_status: 'pending' | 'verified' | 'rejected';
          bio: string | null;
          experience_years: number;
          consultation_fee: number;
          consultation_types: string[] | null;
          clinic_name: string;
          address: string;
          district: string;
          city: string;
          professional_phone: string | null;
          public_email: string | null;
          is_publicly_searchable: boolean;
          rating: number;
          review_count: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          specialty: string;
          sub_specialties?: string[] | null;
          license_number: string;
          verification_status?: 'pending' | 'verified' | 'rejected';
          bio?: string | null;
          experience_years?: number;
          consultation_fee?: number;
          consultation_types?: string[] | null;
          clinic_name: string;
          address: string;
          district: string;
          city?: string;
          professional_phone?: string | null;
          public_email?: string | null;
          is_publicly_searchable?: boolean;
          rating?: number;
          review_count?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          specialty?: string;
          sub_specialties?: string[] | null;
          license_number?: string;
          bio?: string | null;
          experience_years?: number;
          consultation_fee?: number;
          consultation_types?: string[] | null;
          clinic_name?: string;
          address?: string;
          district?: string;
          city?: string;
          professional_phone?: string | null;
          public_email?: string | null;
          rating?: number;
          review_count?: number;
          updated_at?: string | null;
        };
      };
      doctor_availability: {
        Row: {
          doctor_id: string;
          slot_duration_minutes: number;
          is_vacation_mode: boolean;
          weekly_schedule: Json;
          blocked_periods: Json;
          custom_slots: Json;
          updated_at: string;
        };
        Insert: {
          doctor_id: string;
          slot_duration_minutes?: number;
          is_vacation_mode?: boolean;
          weekly_schedule: Json;
          blocked_periods?: Json;
          custom_slots?: Json;
          updated_at?: string;
        };
        Update: {
          slot_duration_minutes?: number;
          is_vacation_mode?: boolean;
          weekly_schedule?: Json;
          blocked_periods?: Json;
          custom_slots?: Json;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          patient_name: string | null;
          patient_phone: string | null;
          doctor_id: string;
          doctor_name: string | null;
          doctor_specialty: string | null;
          clinic_name: string | null;
          clinic_address: string | null;
          date: string;
          time: string;
          status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
          type: 'in_person' | 'teleconsultation';
          fee: number;
          reason: string | null;
          notes: string | null;
          rejection_reason: string | null;
          cancellation_reason: string | null;
          cancelled_by: 'patient' | 'doctor' | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          patient_name?: string | null;
          patient_phone?: string | null;
          doctor_id: string;
          doctor_name?: string | null;
          doctor_specialty?: string | null;
          clinic_name?: string | null;
          clinic_address?: string | null;
          date: string;
          time: string;
          status?: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
          type?: 'in_person' | 'teleconsultation';
          fee: number;
          reason?: string | null;
          notes?: string | null;
          rejection_reason?: string | null;
          cancellation_reason?: string | null;
          cancelled_by?: 'patient' | 'doctor' | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          status?: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
          reason?: string | null;
          notes?: string | null;
          rejection_reason?: string | null;
          cancellation_reason?: string | null;
          cancelled_by?: 'patient' | 'doctor' | null;
          updated_at?: string | null;
        };
      };
    };
  };
}
