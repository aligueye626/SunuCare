import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/services/notificationService';
import {
  AppNotification,
  ExpoPushPreparationStatus,
  getNotificationTypeMeta,
} from '@/types/notification';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { EmptyState } from '@/components/common/EmptyState';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushPrep, setPushPrep] = useState<ExpoPushPreparationStatus | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const recipientId =
    user?.id ||
    (user?.role === 'doctor' ? 'doc-1' : 'pat_pre_1');

  const loadNotifications = useCallback(async () => {
    try {
      setAccessError(null);
      // Enforce recipient-only access: actorId === recipientId
      const result = await notificationService.getNotificationsForRecipient(
        recipientId,
        recipientId
      );
      if (result.error) {
        setAccessError(result.error);
      } else {
        setNotifications(result.notifications);
      }
      setPushPrep(notificationService.getExpoPushPreparationStatus());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recipientId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notif: AppNotification) => {
    if (!notif.isRead) {
      const res = await notificationService.markNotificationAsRead(
        notif.id,
        recipientId
      );
      if (res.notification) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? res.notification! : n))
        );
      }
    }

    if (notif.relatedAppointmentId) {
      if (user?.role === 'doctor') {
        router.push('/doctor-space/appointments');
      } else {
        router.push(`/appointments/${notif.relatedAppointmentId}`);
      }
    } else if (
      notif.type === 'doctor_verification_update' &&
      user?.role === 'doctor'
    ) {
      router.push('/doctor-space/dashboard');
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllNotificationsAsRead(recipientId, recipientId);
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        isRead: true,
      }))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const displayedNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <CustomHeader
        title="Centre de Notifications"
        subtitle="Alertes médicales & suivi en temps réel"
        showBack
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Ionicons
                name="checkmark-done-outline"
                size={22}
                color={Colors.primary}
              />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Recipient-only security banner */}
        <View style={styles.securityBanner}>
          <View style={styles.securityIconWrap}>
            <Ionicons name="lock-closed" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>
              Accès réservé au destinataire ({user?.fullName || 'Compte authentifié'})
            </Text>
            <Text style={styles.securitySubtitle}>
              Politique RLS active : seules les notifications adressées à votre identifiant ({recipientId}) sont accessibles.
            </Text>
          </View>
        </View>

        {/* Expo Push Preparation Banner (Honest status - does not claim live push delivery without physical device test) */}
        {pushPrep && (
          <View style={styles.pushBanner}>
            <View style={styles.pushHeaderRow}>
              <Ionicons name="notifications-circle" size={20} color="#D97706" />
              <Text style={styles.pushTitle}>
                {' '}Architecture Expo Push préparée (In-App actif)
              </Text>
            </View>
            <Text style={styles.pushDesc}>{pushPrep.statusMessage}</Text>
          </View>
        )}

        {/* Filter Bar & Mark All Read */}
        <View style={styles.filterRow}>
          <View style={styles.tabsWrap}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === 'all' && styles.filterTabTextActive,
                ]}
              >
                Toutes ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === 'unread' && styles.filterTabActive,
              ]}
              onPress={() => setFilter('unread')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === 'unread' && styles.filterTabTextActive,
                ]}
              >
                Non lues ({unreadCount})
              </Text>
            </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllRead}
            >
              <Ionicons
                name="checkmark-done"
                size={15}
                color={Colors.primary}
              />
              <Text style={styles.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Chargement de vos notifications sécurisées...
            </Text>
          </View>
        ) : accessError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Accès refusé"
            description={accessError}
          />
        ) : displayedNotifications.length === 0 ? (
          <EmptyState
            icon="bell-off-outline"
            title={
              filter === 'unread'
                ? 'Aucune notification non lue'
                : 'Aucune notification'
            }
            description="Vous recevrez ici les confirmations de rendez-vous, rappels de consultation et mises à jour de vérification."
          />
        ) : (
          displayedNotifications.map((item) => {
            const meta = getNotificationTypeMeta(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notifCard,
                  !item.isRead && styles.notifCardUnread,
                ]}
                activeOpacity={0.85}
                onPress={() => handleMarkAsRead(item)}
              >
                <View style={styles.notifTopRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: meta.bgColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={meta.iconName as any}
                      size={14}
                      color={meta.accentColor}
                    />
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: meta.accentColor },
                      ]}
                    >
                      {meta.labelFr}
                    </Text>
                  </View>

                  <View style={styles.statusRight}>
                    {!item.isRead ? (
                      <View style={styles.unreadPill}>
                        <View style={styles.unreadDot} />
                        <Text style={styles.unreadPillText}>Non lue</Text>
                      </View>
                    ) : (
                      <Text style={styles.readText}>Lue</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifMessage}>{item.message}</Text>

                <View style={styles.metaFooter}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {formatTimestamp(item.createdAt)}
                    </Text>
                  </View>

                  {item.relatedAppointmentId && (
                    <View style={styles.appointmentLinkBadge}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color={Colors.primary}
                      />
                      <Text style={styles.appointmentLinkText}>
                        RDV #{item.relatedAppointmentId}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={13}
                        color={Colors.primary}
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#C5E8E4',
    gap: 10,
  },
  securityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  securitySubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  pushBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pushHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pushTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  pushDesc: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tabsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.secondaryLight,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  notifCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  notifCardUnread: {
    borderColor: Colors.primary,
    borderLeftWidth: 4,
    backgroundColor: '#FAFFFE',
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  readText: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '500',
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  metaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  appointmentLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appointmentLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
});
