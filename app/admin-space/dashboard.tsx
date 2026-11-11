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
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import {
  AdminAuditLogEntry,
  AdminDashboardMetrics,
  RegisteredPatientSummary,
} from '@/types/admin';
import { EmptyState } from '@/components/common/EmptyState';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [patients, setPatients] = useState<RegisteredPatientSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const actorId = user?.id || 'admin_pre_1';
  const actorRole = user?.role || 'admin';

  const loadDashboardData = useCallback(async () => {
    try {
      setPermissionError(null);
      const [metricsRes, patientsRes, logsRes] = await Promise.all([
        adminService.getAdminDashboardMetrics(actorId, actorRole),
        adminService.getRegisteredPatients(actorId, actorRole),
        adminService.getAuditLogs(actorId, actorRole),
      ]);

      if (metricsRes.error) {
        setPermissionError(metricsRes.error);
        return;
      }

      setMetrics(metricsRes.metrics);
      setPatients(patientsRes.patients);
      setAuditLogs(logsRes.logs.slice(0, 6));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actorId, actorRole]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatFCFA = (amount: number) =>
    `${amount.toLocaleString('fr-FR')} FCFA`;

  if (permissionError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <EmptyState
            icon="shield-outline"
            title="Accès Administrateur Requis"
            description={permissionError}
          />
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.backHomeText}>Retour à l’accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Admin Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.white} />
            <Text style={styles.roleBadgeText}>
              ADMINISTRATION INTERNE • DAKAR
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            accessibilityLabel="Se déconnecter"
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.white} />
            <Text style={styles.logoutText}>Quitter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.adminName}>
          {user?.fullName || 'Pr. Abdoulaye Wade Diallo'}
        </Text>
        <Text style={styles.adminDept}>
          {user?.role === 'admin'
            ? user.department
            : 'Direction Médicale & Conformité Ordre des Médecins du Sénégal'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Chargement des indicateurs d’administration...
            </Text>
          </View>
        ) : (
          <>
            {/* Quick Action: Doctor Verification */}
            <TouchableOpacity
              style={styles.verificationBanner}
              activeOpacity={0.9}
              onPress={() =>
                router.push('/admin-space/doctor-verification' as any)
              }
            >
              <View style={styles.verificationIconBox}>
                <Ionicons
                  name="medkit-outline"
                  size={24}
                  color={Colors.white}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.verificationTitleRow}>
                  <Text style={styles.verificationBannerTitle}>
                    Vérification des Médecins
                  </Text>
                  {(metrics?.pendingVerificationRequestsCount || 0) > 0 && (
                    <View style={styles.pendingCountPill}>
                      <Text style={styles.pendingCountPillText}>
                        {metrics?.pendingVerificationRequestsCount} en attente
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.verificationBannerSub}>
                  Examiner les dossiers ONMS, vérifier les pièces justificatives privées et statuer sur la visibilité publique.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={Colors.primary}
              />
            </TouchableOpacity>

            {/* Primary Governance Metrics */}
            <Text style={styles.sectionTitle}>
              Effectifs & Statuts de Vérification
            </Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: '#EBF8FF' },
                  ]}
                >
                  <Ionicons name="people" size={20} color="#2B6CB0" />
                </View>
                <Text style={styles.metricValue}>
                  {metrics?.registeredPatientsCount ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Patients inscrits</Text>
              </View>

              <View style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: Colors.secondaryLight },
                  ]}
                >
                  <Ionicons name="medkit" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.metricValue}>
                  {metrics?.registeredDoctorsCount ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Médecins inscrits</Text>
              </View>

              <TouchableOpacity
                style={[styles.metricCard, styles.metricCardWarning]}
                onPress={() =>
                  router.push('/admin-space/doctor-verification' as any)
                }
              >
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: '#FEF3C7' },
                  ]}
                >
                  <Ionicons name="time" size={20} color="#D97706" />
                </View>
                <Text style={[styles.metricValue, { color: '#D97706' }]}>
                  {metrics?.pendingVerificationRequestsCount ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Demandes en attente</Text>
              </TouchableOpacity>

              <View style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: '#DEF7EC' },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.success}
                  />
                </View>
                <Text style={[styles.metricValue, { color: Colors.success }]}>
                  {metrics?.verifiedDoctorsCount ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Médecins vérifiés</Text>
              </View>

              <View style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: '#FDE8E8' },
                  ]}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={Colors.error}
                  />
                </View>
                <Text style={[styles.metricValue, { color: Colors.error }]}>
                  {metrics?.rejectedVerificationRequestsCount ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Demandes refusées</Text>
              </View>
            </View>

            {/* Appointment Statistics */}
            <Text style={styles.sectionTitle}>
              Statistiques des Rendez-vous (Dakar)
            </Text>
            <View style={styles.appointmentStatsCard}>
              <View style={styles.aptStatsHeader}>
                <View>
                  <Text style={styles.aptTotalLabel}>
                    Total des consultations enregistrées
                  </Text>
                  <Text style={styles.aptTotalValue}>
                    {metrics?.appointmentStats.totalAppointments ?? 0} rendez-vous
                  </Text>
                </View>
                <View style={styles.revenueBadge}>
                  <Text style={styles.revenueBadgeLabel}>Volume estimé</Text>
                  <Text style={styles.revenueBadgeValue}>
                    {formatFCFA(
                      metrics?.appointmentStats.totalConfirmedVolumeFCFA ?? 0
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.aptBreakdownRow}>
                <View style={styles.aptStatPill}>
                  <Text style={[styles.aptStatNum, { color: '#D97706' }]}>
                    {metrics?.appointmentStats.pendingAppointments ?? 0}
                  </Text>
                  <Text style={styles.aptStatText}>En attente</Text>
                </View>

                <View style={styles.aptStatPill}>
                  <Text style={[styles.aptStatNum, { color: Colors.primary }]}>
                    {metrics?.appointmentStats.confirmedAppointments ?? 0}
                  </Text>
                  <Text style={styles.aptStatText}>Confirmés</Text>
                </View>

                <View style={styles.aptStatPill}>
                  <Text style={[styles.aptStatNum, { color: Colors.success }]}>
                    {metrics?.appointmentStats.completedAppointments ?? 0}
                  </Text>
                  <Text style={styles.aptStatText}>Terminés</Text>
                </View>

                <View style={styles.aptStatPill}>
                  <Text style={[styles.aptStatNum, { color: Colors.error }]}>
                    {(metrics?.appointmentStats.cancelledAppointments ?? 0) +
                      (metrics?.appointmentStats.rejectedAppointments ?? 0)}
                  </Text>
                  <Text style={styles.aptStatText}>Annulés/Refus</Text>
                </View>
              </View>
            </View>

            {/* Registered Patients */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Patients Inscrits ({patients.length})
              </Text>
            </View>
            <View style={styles.listCard}>
              {patients.map((pat, index) => (
                <View
                  key={pat.id}
                  style={[
                    styles.patientRow,
                    index < patients.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientInitials}>
                      {pat.fullName
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{pat.fullName}</Text>
                    <Text style={styles.patientMeta}>
                      {pat.email} • {pat.phone}
                    </Text>
                    <Text style={styles.patientDistrict}>
                      Quartier : {pat.district}
                    </Text>
                  </View>
                  <View style={styles.patientAptBadge}>
                    <Text style={styles.patientAptCount}>
                      Dakar
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Recent Administrative Audit Logs */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Journal d’Audit Administratif
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push('/admin-space/doctor-verification' as any)
                }
              >
                <Text style={styles.seeAllLink}>Voir tout →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.listCard}>
              {auditLogs.map((log, index) => (
                <View
                  key={log.id}
                  style={[
                    styles.auditRow,
                    index < auditLogs.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.auditHeader}>
                    <Text style={styles.auditTarget}>
                      {log.targetDoctorName}
                    </Text>
                    <Text style={styles.auditActionBadge}>
                      {log.actionType === 'doctor_verification_approved'
                        ? 'APPROBATION'
                        : log.actionType === 'doctor_verification_rejected'
                        ? 'REFUS'
                        : 'INSPECTION PIÈCE'}
                    </Text>
                  </View>
                  <Text style={styles.auditReason}>{log.decisionReason}</Text>
                  <Text style={styles.auditMeta}>
                    Par {log.adminName} •{' '}
                    {new Date(log.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              ))}
            </View>
          </>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  backHomeBtn: {
    marginTop: Spacing.md,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backHomeText: {
    color: Colors.white,
    fontWeight: '700',
  },
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(224, 82, 82, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  adminName: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  adminDept: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 12,
    ...Shadows.md,
  },
  verificationIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  verificationBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  pendingCountPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingCountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  verificationBannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  metricCardWarning: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFDF5',
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  appointmentStatsCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  aptStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: 12,
  },
  aptTotalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  aptTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  revenueBadge: {
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  revenueBadgeLabel: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  revenueBadgeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  aptBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aptStatPill: {
    alignItems: 'center',
    flex: 1,
  },
  aptStatNum: {
    fontSize: 17,
    fontWeight: '800',
  },
  aptStatText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingBottom: 12,
    marginBottom: 12,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  patientMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  patientDistrict: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  patientAptBadge: {
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  patientAptCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  auditRow: {
    gap: 4,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditTarget: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  auditActionBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  auditReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  auditMeta: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
});
