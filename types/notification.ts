/**
 * Notification Types for SunuCare In-App Notification Center & Push Preparation (Phase 7)
 *
 * Notification types required:
 * 1. appointment_request_received (Demande de rendez-vous reçue)
 * 2. appointment_confirmed (Rendez-vous confirmé)
 * 3. appointment_rejected (Demande de rendez-vous refusée)
 * 4. appointment_cancelled (Rendez-vous annulé)
 * 5. appointment_reminder (Rappel de rendez-vous)
 * 6. doctor_verification_update (Mise à jour de vérification professionnelle)
 */

export type NotificationType =
  | 'appointment_request_received'
  | 'appointment_confirmed'
  | 'appointment_rejected'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'doctor_verification_update';

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedAppointmentId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ExpoPushPreparationStatus {
  isConfigured: boolean;
  pushToken: string | null;
  statusMessage: string;
  lastCheckedAt: string;
}

export function getNotificationTypeMeta(type: NotificationType): {
  labelFr: string;
  iconName: string;
  accentColor: string;
  bgColor: string;
} {
  switch (type) {
    case 'appointment_request_received':
      return {
        labelFr: 'Nouvelle demande RDV',
        iconName: 'calendar-import',
        accentColor: '#147D75',
        bgColor: '#E6F5F3',
      };
    case 'appointment_confirmed':
      return {
        labelFr: 'Rendez-vous confirmé',
        iconName: 'calendar-check',
        accentColor: '#10B981',
        bgColor: '#D1FAE5',
      };
    case 'appointment_rejected':
      return {
        labelFr: 'Demande refusée',
        iconName: 'calendar-remove',
        accentColor: '#E05252',
        bgColor: '#FEE2E2',
      };
    case 'appointment_cancelled':
      return {
        labelFr: 'Rendez-vous annulé',
        iconName: 'calendar-alert',
        accentColor: '#E05252',
        bgColor: '#FEE2E2',
      };
    case 'appointment_reminder':
      return {
        labelFr: 'Rappel de consultation',
        iconName: 'bell-ring-outline',
        accentColor: '#E8A838',
        bgColor: '#FEF3C7',
      };
    case 'doctor_verification_update':
      return {
        labelFr: 'Vérification professionnelle',
        iconName: 'shield-check-outline',
        accentColor: '#147D75',
        bgColor: '#E6F5F3',
      };
  }
}
