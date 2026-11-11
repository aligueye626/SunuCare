/**
 * Administration, Doctor Verification & Security Audit Types (Phase 7)
 */

import { DoctorVerificationStatus } from './user';

export type VerificationDocumentType =
  | 'medical_diploma'
  | 'ordre_medecins_certificate'
  | 'national_id'
  | 'practice_authorization';

export interface DoctorVerificationDocument {
  id: string;
  doctorId: string;
  documentType: VerificationDocumentType;
  documentTitle: string;
  storageBucket: 'doctor-verification-documents';
  storagePath: string;
  fileSizeKb: number;
  mimeType: string;
  uploadedAt: string;
  summaryPreviewFr: string;
}

export interface DoctorVerificationHistoryEntry {
  id: string;
  doctorId: string;
  doctorName: string;
  adminId: string;
  adminName: string;
  previousStatus: DoctorVerificationStatus;
  newStatus: DoctorVerificationStatus;
  decisionReason: string;
  createdAt: string;
}

export type AdminAuditActionType =
  | 'doctor_verification_approved'
  | 'doctor_verification_rejected'
  | 'doctor_document_reviewed';

export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  actionType: AdminAuditActionType;
  targetDoctorId: string;
  targetDoctorName: string;
  previousStatus: DoctorVerificationStatus;
  newStatus: DoctorVerificationStatus;
  decisionReason: string;
  createdAt: string;
}

export interface DoctorApplicationItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  professionalPhone: string;
  specialty: string;
  subSpecialties: string[];
  licenseNumber: string; // N° Ordre des Médecins du Sénégal
  facilityName: string;
  facilityAddress: string;
  facilityDistrict: string;
  consultationFeeFCFA: number;
  verificationStatus: DoctorVerificationStatus;
  isPubliclySearchable: boolean;
  submittedAt: string;
  lastDecisionReason?: string;
  lastReviewedAt?: string;
  lastReviewedBy?: string;
  documents: DoctorVerificationDocument[];
}

export interface RegisteredPatientSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  district: string;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  registeredPatientsCount: number;
  registeredDoctorsCount: number;
  pendingVerificationRequestsCount: number;
  verifiedDoctorsCount: number;
  rejectedVerificationRequestsCount: number;
  appointmentStats: {
    totalAppointments: number;
    pendingAppointments: number;
    confirmedAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    rejectedAppointments: number;
    totalConfirmedVolumeFCFA: number;
  };
}

