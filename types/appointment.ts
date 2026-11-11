export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type ConsultationType = 'in_person' | 'teleconsultation';

export type AppointmentActorRole = 'patient' | 'doctor';

export interface Appointment {
  id: string;
  referenceCode?: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  clinicName: string;
  clinicAddress?: string;
  district?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  type?: ConsultationType;
  consultationType?: ConsultationType;
  feeFCFA: number;
  reason?: string;
  notes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledBy?: 'patient' | 'doctor';
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface AvailableSlotItem {
  time: string; // HH:mm
  period: 'morning' | 'afternoon';
  isAvailable: boolean;
  reasonUnavailable?: string;
}

export interface BookableDateItem {
  date: string; // YYYY-MM-DD
  dayShort: string; // Lun, Mar...
  dayNum: string; // 12, 13...
  monthShort: string; // NOV, DÉC...
  labelFr: string; // Aujourd'hui, Demain, Jeu 14 Nov...
  isBlocked: boolean;
  blockedReason?: string;
  availableCount: number;
  slots: AvailableSlotItem[];
}

/**
 * Controlled Status Transitions Matrix (Phase 6 Part 5)
 * - pending -> confirmed (doctor), rejected (doctor), cancelled (patient | doctor)
 * - confirmed -> completed (doctor), cancelled (patient | doctor)
 * - rejected, cancelled, completed -> terminal states (no further transitions allowed)
 */
export const VALID_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  {
    next: AppointmentStatus;
    allowedRoles: AppointmentActorRole[];
  }[]
> = {
  pending: [
    { next: 'confirmed', allowedRoles: ['doctor'] },
    { next: 'rejected', allowedRoles: ['doctor'] },
    { next: 'cancelled', allowedRoles: ['patient', 'doctor'] },
  ],
  confirmed: [
    { next: 'completed', allowedRoles: ['doctor'] },
    { next: 'cancelled', allowedRoles: ['patient', 'doctor'] },
  ],
  rejected: [],
  cancelled: [],
  completed: [],
  rescheduled: [],
};

export function validateStatusTransition(
  currentStatus: AppointmentStatus,
  nextStatus: AppointmentStatus,
  actorRole: AppointmentActorRole
): { valid: boolean; error: string | null } {
  if (currentStatus === nextStatus) {
    return {
      valid: false,
      error: `Le rendez-vous possède déjà le statut "${getAppointmentStatusLabel(currentStatus)}".`,
    };
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  const matchingRule = allowedTransitions.find((t) => t.next === nextStatus);

  if (!matchingRule) {
    if (
      currentStatus === 'completed' ||
      currentStatus === 'cancelled' ||
      currentStatus === 'rejected'
    ) {
      return {
        valid: false,
        error: `Transition refusée : un rendez-vous "${getAppointmentStatusLabel(currentStatus)}" est clôturé et ne peut plus changer de statut.`,
      };
    }
    return {
      valid: false,
      error: `Transition de statut invalide : impossible de passer de "${getAppointmentStatusLabel(currentStatus)}" à "${getAppointmentStatusLabel(nextStatus)}".`,
    };
  }

  if (!matchingRule.allowedRoles.includes(actorRole)) {
    return {
      valid: false,
      error:
        actorRole === 'patient'
          ? 'Action non autorisée : seul le praticien peut effectuer cette opération sur le rendez-vous.'
          : 'Action non autorisée pour ce rôle.',
    };
  }

  return { valid: true, error: null };
}

export function getAppointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'pending':
      return 'En attente de validation';
    case 'confirmed':
      return 'Confirmé';
    case 'rejected':
      return 'Refusé par le cabinet';
    case 'cancelled':
      return 'Annulé';
    case 'completed':
      return 'Consultation terminée';
    case 'rescheduled':
      return 'Reprogrammé';
    default:
      return status;
  }
}
