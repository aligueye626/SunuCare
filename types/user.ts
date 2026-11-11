/**
 * User and Account Types for SunuCare
 * Public Registration Roles: PATIENT, DOCTOR
 * Internal Server-Assigned Role: ADMIN
 */

import { ConsultationType } from './appointment';

export type PublicRegistrableRole = 'patient' | 'doctor';
export type UserRole = PublicRegistrableRole | 'admin';

export type DoctorVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface BaseUserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile extends BaseUserProfile {
  role: 'patient';
  district?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F' | 'other';
  emergencyContact?: string;
  bloodGroup?: string;
  allergies?: string;
}

export interface DoctorProfile extends BaseUserProfile {
  role: 'doctor';
  specialty: string;
  subSpecialties?: string[];
  licenseNumber?: string; // Numéro Ordre des Médecins
  facilityName: string; // Nom de la clinique ou cabinet
  facilityAddress: string; // Adresse à Dakar
  facilityDistrict: string; // Quartier (Plateau, Almadies...)
  professionalPhone: string;
  publicEmail?: string;
  consultationTypes?: ConsultationType[]; // ['in_person', 'teleconsultation']
  verificationStatus: DoctorVerificationStatus; // 'pending' upon registration
  bio?: string;
  experienceYears?: number;
  consultationFeeFCFA: number;
  isPubliclySearchable: boolean; // MUST be false when verificationStatus is pending or rejected
  rating?: number;
  reviewCount?: number;
  rejectionReason?: string;
}

export interface AdminProfile extends BaseUserProfile {
  role: 'admin';
  department: string;
  assignedByServer: true;
}

export type AuthUser = PatientProfile | DoctorProfile | AdminProfile;

export interface PatientRegisterData {
  role: 'patient';
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // Sénégal (+221 ...)
  password: string;
  passwordConfirmation: string;
}

export interface DoctorRegisterData {
  role: 'doctor';
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // Personnel
  password: string;
  passwordConfirmation: string;
  specialty: string;
  licenseNumber?: string;
  facilityName: string;
  facilityAddress: string;
  facilityDistrict: string;
  professionalPhone?: string;
}

/**
 * SECURITY RULE: Public registration is strictly restricted to PATIENT and DOCTOR.
 * ADMIN accounts can never be created via public registration.
 */
export type RegisterData = PatientRegisterData | DoctorRegisterData;

export interface LoginCredentials {
  email: string;
  password: string;
}
