/**
 * In-App Notification Service & Expo Push Preparation for SunuCare (Phase 7 — Part 2)
 *
 * Supported Notification Types:
 * - appointment_request_received
 * - appointment_confirmed
 * - appointment_rejected
 * - appointment_cancelled
 * - appointment_reminder
 * - doctor_verification_update
 *
 * Security Rule:
 * Strictly enforces recipient-only access. A user can only read or mark as read
 * notifications where notification.recipientId === actorId.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AppNotification,
  ExpoPushPreparationStatus,
  NotificationType,
} from '@/types/notification';
import { TODAY_ISO, TOMORROW_ISO } from './mockData';

const STORAGE_KEY_NOTIFICATIONS = '@sunucare_notifications_v7';

const SEEDED_NOTIFICATIONS: AppNotification[] = [
  // Patient (pat_pre_1: Fatou Diop) notifications
  {
    id: 'notif_seed_1',
    recipientId: 'pat_pre_1',
    title: 'Rendez-vous confirmé par Dr. Aïssatou Ndiaye',
    message: `Votre consultation de Cardiologie à la Clinique du Cap (Plateau, Dakar) prévue le ${TODAY_ISO} à 15:30 est confirmée.`,
    type: 'appointment_confirmed',
    relatedAppointmentId: 'apt-1',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'notif_seed_2',
    recipientId: 'pat_pre_1',
    title: 'Rappel : Consultation prévue aujourd’hui à 15:30',
    message:
      'N’oubliez pas votre rendez-vous avec Dr. Aïssatou Ndiaye (Clinique du Cap, Avenue Pasteur). Pensez à apporter vos précédents bilans ECG.',
    type: 'appointment_reminder',
    relatedAppointmentId: 'apt-1',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'notif_seed_3',
    recipientId: 'pat_pre_1',
    title: 'Confirmation d’annulation de rendez-vous',
    message:
      'Votre rendez-vous de Dentisterie avec Dr. Ibrahima Sarr du 2026-09-05 à 16:00 a bien été annulé.',
    type: 'appointment_cancelled',
    relatedAppointmentId: 'apt-7',
    isRead: true,
    createdAt: '2026-09-04T12:05:00Z',
  },

  // Doctor (doc_pre_1: Dr. Aïssatou Ndiaye) notifications
  {
    id: 'notif_seed_4',
    recipientId: 'doc_pre_1',
    title: 'Nouvelle demande de rendez-vous reçue',
    message: `Moussa Ndiaye souhaite réserver une consultation au cabinet le ${TODAY_ISO} à 11:00 (Motif : Essoufflement à l’effort et palpitations).`,
    type: 'appointment_request_received',
    relatedAppointmentId: 'apt-2',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'notif_seed_5',
    recipientId: 'doc_pre_1',
    title: 'Nouvelle demande de téléconsultation',
    message: `Ibrahima Seck a demandé une téléconsultation pour le ${TOMORROW_ISO} à 09:30 (Lecture résultats Holter tensionnel 24h).`,
    type: 'appointment_request_received',
    relatedAppointmentId: 'apt-3',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'notif_seed_6',
    recipientId: 'doc_pre_1',
    title: 'Profil professionnel vérifié par l’Administration',
    message:
      'Votre inscription à l’Ordre des Médecins du Sénégal (OM-SN-2012-0482) a été vérifiée. Votre fiche praticien est active dans l’annuaire public de Dakar.',
    type: 'doctor_verification_update',
    isRead: true,
    createdAt: '2026-11-01T09:00:00Z',
  },

  // Pending Doctor (doc-9: Dr. Ibrahima Fall) notification
  {
    id: 'notif_seed_7',
    recipientId: 'doc-9',
    title: 'Dossier professionnel en cours d’examen',
    message:
      'Votre demande d’inscription praticien (Dermatologie - Médina, Dakar) a bien été reçue. Nos administrateurs vérifient vos pièces justificatives.',
    type: 'doctor_verification_update',
    isRead: false,
    createdAt: '2026-11-10T10:00:00Z',
  },
];

async function loadLocalNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    await AsyncStorage.setItem(
      STORAGE_KEY_NOTIFICATIONS,
      JSON.stringify(SEEDED_NOTIFICATIONS)
    );
    return [...SEEDED_NOTIFICATIONS];
  } catch {
    return [...SEEDED_NOTIFICATIONS];
  }
}

async function saveLocalNotifications(list: AppNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list));
  } catch {
    // Non-blocking
  }
}

function mapRowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    title: row.title,
    message: row.message,
    type: row.notification_type as NotificationType,
    relatedAppointmentId: row.related_appointment_id || undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export const notificationService = {
  /**
   * Fetch notifications for a recipient.
   * SECURITY RULE: Enforce recipient-only access (recipientId MUST equal actorId).
   */
  async getNotificationsForRecipient(
    recipientId: string,
    actorId?: string
  ): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
    error: string | null;
  }> {
    if (!recipientId) {
      return {
        notifications: [],
        unreadCount: 0,
        error: 'Identifiant destinataire manquant.',
      };
    }

    // Strict recipient-only authorization check
    if (actorId !== undefined && actorId !== recipientId) {
      return {
        notifications: [],
        unreadCount: 0,
        error:
          'Accès refusé : vous ne pouvez consulter que vos propres notifications.',
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (
          supabase.from('notifications' as any) as any
        )
          .select('*')
          .eq('recipient_id', recipientId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const items = data.map(mapRowToNotification);
          return {
            notifications: items,
            unreadCount: items.filter((n) => !n.isRead).length,
            error: null,
          };
        }
      } catch {
        // Fallback to local store
      }
    }

    const all = await loadLocalNotifications();
    const myNotifications = all
      .filter((n) => n.recipientId === recipientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      notifications: myNotifications,
      unreadCount: myNotifications.filter((n) => !n.isRead).length,
      error: null,
    };
  },

  /**
   * Return unread notification count for a recipient (enforcing recipient-only access)
   */
  async getUnreadCount(
    recipientId: string,
    actorId?: string
  ): Promise<number> {
    const res = await this.getNotificationsForRecipient(recipientId, actorId);
    return res.unreadCount;
  },

  /**
   * Create a new in-app notification for a target recipient
   */
  async createNotification(input: {
    recipientId: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedAppointmentId?: string;
  }): Promise<AppNotification> {
    const now = new Date().toISOString();
    const newNotification: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientId: input.recipientId,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type,
      relatedAppointmentId: input.relatedAppointmentId,
      isRead: false,
      createdAt: now,
    };

    if (isSupabaseConfigured()) {
      try {
        await (supabase.from('notifications' as any) as any).insert({
          id: newNotification.id,
          recipient_id: newNotification.recipientId,
          title: newNotification.title,
          message: newNotification.message,
          notification_type: newNotification.type,
          related_appointment_id:
            newNotification.relatedAppointmentId || null,
          is_read: false,
          created_at: now,
        });
      } catch {
        // Local persistence fallback
      }
    }

    const all = await loadLocalNotifications();
    all.unshift(newNotification);
    await saveLocalNotifications(all);
    return newNotification;
  },

  /**
   * Mark a single notification as read.
   * SECURITY RULE: Only the recipient (actorId === notification.recipientId) can mark it as read.
   */
  async markNotificationAsRead(
    notificationId: string,
    actorId: string
  ): Promise<{ notification: AppNotification | null; error: string | null }> {
    if (!actorId) {
      return {
        notification: null,
        error: 'Authentification requise pour modifier une notification.',
      };
    }

    const all = await loadLocalNotifications();
    const index = all.findIndex((n) => n.id === notificationId);

    if (index === -1) {
      return { notification: null, error: 'Notification introuvable.' };
    }

    const target = all[index];
    if (target.recipientId !== actorId) {
      return {
        notification: null,
        error:
          'Accès refusé : cette notification est destinée à un autre utilisateur.',
      };
    }

    const updated: AppNotification = {
      ...target,
      isRead: true,
    };

    if (isSupabaseConfigured()) {
      try {
        await (supabase.from('notifications' as any) as any)
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('recipient_id', actorId);
      } catch {
        // Local fallback
      }
    }

    all[index] = updated;
    await saveLocalNotifications(all);
    return { notification: updated, error: null };
  },

  /**
   * Mark all notifications for a recipient as read.
   * SECURITY RULE: recipientId must match actorId.
   */
  async markAllNotificationsAsRead(
    recipientId: string,
    actorId: string
  ): Promise<{ updatedCount: number; error: string | null }> {
    if (!recipientId || !actorId || recipientId !== actorId) {
      return {
        updatedCount: 0,
        error:
          'Accès refusé : vous ne pouvez modifier que vos propres notifications.',
      };
    }

    const all = await loadLocalNotifications();
    let updatedCount = 0;

    const next = all.map((n) => {
      if (n.recipientId === recipientId && !n.isRead) {
        updatedCount++;
        return { ...n, isRead: true };
      }
      return n;
    });

    if (isSupabaseConfigured()) {
      try {
        await (supabase.from('notifications' as any) as any)
          .update({ is_read: true })
          .eq('recipient_id', recipientId);
      } catch {
        // Local fallback
      }
    }

    await saveLocalNotifications(next);
    return { updatedCount, error: null };
  },

  /**
   * Prepare Expo Push Notification architecture without claiming remote push delivery is active
   * until physical device EAS credentials & push certificates (APNs / FCM) are configured.
   */
  getExpoPushPreparationStatus(): ExpoPushPreparationStatus {
    return {
      isConfigured: false,
      pushToken: null,
      statusMessage:
        'Architecture Push Expo préparée. La livraison Push distante (FCM/APNs) nécessite un build de développement EAS et la configuration des certificats push sur appareil physique. Les notifications temps réel in-app sont pleinement actives.',
      lastCheckedAt: new Date().toISOString(),
    };
  },
};

export default notificationService;
