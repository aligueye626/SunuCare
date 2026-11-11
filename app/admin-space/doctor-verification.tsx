import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import {
  AdminAuditLogEntry,
  DoctorApplicationItem,
  DoctorVerificationDocument,
  DoctorVerificationHistoryEntry,
} from '@/types/admin';
import { CustomHeader } from '@/components/layout/CustomHeader';
import { EmptyState } from '@/components/common/EmptyState';

type VerificationTab = 'pending' | 'verified' | 'rejected' | 'history';

export default function DoctorVerificationScreen() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<VerificationTab>('pending');
  const [applications, setApplications] = useState<DoctorApplicationItem[]>([]);
  const [history, setHistory] = useState<DoctorVerificationHistoryEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Decision Modal State
  const [selectedDoctor, setSelectedDoctor] =
    useState<DoctorApplicationItem | null>(null);
  const [decisionType, setDecisionType] = useState<
    'verified' | 'rejected' | null
  >(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Private Document Inspection Modal State
  const [inspectedDoc, setInspectedDoc] = useState<{
    document: DoctorVerificationDocument;
    signedUrl: string;
    doctorName: string;
  } | null>(null);

  const actorRole = user?.role || 'admin';
  const actorId = user?.id || 'admin_pre_1';
  const actorName = user?.fullName || 'Pr. Abdoulaye Wade Diallo';

  const loadData = useCallback(async () => {
    try {
      setPermissionError(null);
      const [appsRes, histRes, logsRes] = await Promise.all([
        adminService.getDoctorApplications(actorId, actorRole, 'all'),
        adminService.getVerificationHistory(actorId, actorRole),
        adminService.getAuditLogs(actorId, actorRole),
      ]);

      if (appsRes.error) {
        setPermissionError(appsRes.error);
        return;
      }

      setApplications(appsRes.applications);
      setHistory(histRes.history);
      setAuditLogs(logsRes.logs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actorId, actorRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInspectDocument = async (
    doc: DoctorVerificationDocument,
    doctorName: string
  ) => {
    const res = await adminService.getVerificationDocumentAccess({
      documentId: doc.id,
      doctorId: doc.doctorId,
      actorId,
      actorRole,
      actorName,
    });
    if (res.error || !res.document || !res.signedStorageUrl) {
      Alert.alert(
        'Accès restreint',
        res.error || 'Impossible d’ouvrir le document privé.'
      );
      return;
    }

    setInspectedDoc({
      document: res.document,
      signedUrl: res.signedStorageUrl,
      doctorName,
    });
    // Refresh audit logs to show document inspection trace
    const logsRes = await adminService.getAuditLogs(actorId, actorRole);
    setAuditLogs(logsRes.logs);
  };

  const openDecisionModal = (
    docApp: DoctorApplicationItem,
    decision: 'verified' | 'rejected'
  ) => {
    setSelectedDoctor(docApp);
    setDecisionType(decision);
    setDecisionReason(
      decision === 'verified'
        ? `Conformité attestée : numéro d’inscription ${docApp.licenseNumber} et diplôme de ${docApp.specialty} vérifiés auprès de l’Ordre des Médecins du Sénégal.`
        : ''
    );
  };

  const handleConfirmDecision = async () => {
    if (!selectedDoctor || !decisionType) return;

    if (decisionReason.trim().length < 5) {
      Alert.alert(
        'Motif obligatoire',
        'Veuillez saisir un motif de décision explicite (au moins 5 caractères) pour le registre d’audit et la notification du praticien.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminService.reviewDoctorVerification({
        actorId,
        actorRole,
        actorName,
        targetDoctorId: selectedDoctor.id,
        decision: decisionType,
        decisionReason: decisionReason.trim(),
      });

      if (!res.application || res.error) {
        Alert.alert('Erreur de validation', res.error || 'Action refusée.');
        return;
      }

      setSelectedDoctor(null);
      setDecisionType(null);
      setDecisionReason('');
      await loadData();

      Alert.alert(
        decisionType === 'verified'
          ? 'Praticien approuvé et publié'
          : 'Demande refusée',
        decisionType === 'verified'
          ? `${selectedDoctor.fullName} est désormais vérifié(e) et visible dans les résultats de recherche publique à Dakar. Une notification lui a été envoyée.`
          : `Le dossier de ${selectedDoctor.fullName} a été refusé et demeure masqué de la recherche publique. Une notification avec le motif lui a été envoyée.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (activeTab === 'pending') return app.verificationStatus === 'pending';
    if (activeTab === 'verified') return app.verificationStatus === 'verified';
    if (activeTab === 'rejected') return app.verificationStatus === 'rejected';
    return false;
  });

  const pendingCount = applications.filter(
    (a) => a.verificationStatus === 'pending'
  ).length;
  const verifiedCount = applications.filter(
    (a) => a.verificationStatus === 'verified'
  ).length;
  const rejectedCount = applications.filter(
    (a) => a.verificationStatus === 'rejected'
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <CustomHeader
        title="Vérification des Médecins"
        subtitle="Conformité Ordre des Médecins du Sénégal"
        showBack
      />

      {/* Filter Tabs */}
      <View style={styles.tabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'pending' && styles.tabPillActive,
            ]}
            onPress={() => setActiveTab('pending')}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === 'pending' && styles.tabPillTextActive,
              ]}
            >
              En attente ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'verified' && styles.tabPillActive,
            ]}
            onPress={() => setActiveTab('verified')}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === 'verified' && styles.tabPillTextActive,
              ]}
            >
              Vérifiés ({verifiedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'rejected' && styles.tabPillActive,
            ]}
            onPress={() => setActiveTab('rejected')}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === 'rejected' && styles.tabPillTextActive,
              ]}
            >
              Refusés ({rejectedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'history' && styles.tabPillActive,
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === 'history' && styles.tabPillTextActive,
              ]}
            >
              Historique & Audit ({history.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Storage Security Notice */}
        <View style={styles.storageNotice}>
          <Ionicons name="lock-closed" size={16} color={Colors.primaryDark} />
          <Text style={styles.storageNoticeText}>
            Stockage privé Supabase (`doctor-verification-documents`) : les diplômes et attestations ONMS ne sont jamais exposés publiquement.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Chargement des dossiers praticiens...
            </Text>
          </View>
        ) : permissionError ? (
          <EmptyState
            icon="lock-outline"
            title="Accès non autorisé"
            description={permissionError}
          />
        ) : activeTab === 'history' ? (
          <>
            <Text style={styles.sectionHeading}>
              Historique des Décisions de Vérification
            </Text>
            {history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDoctorName}>
                    {item.doctorName}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      item.newStatus === 'verified'
                        ? styles.statusVerified
                        : styles.statusRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            item.newStatus === 'verified'
                              ? Colors.success
                              : Colors.error,
                        },
                      ]}
                    >
                      {item.previousStatus.toUpperCase()} →{' '}
                      {item.newStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyReason}>
                  Motif : {item.decisionReason}
                </Text>
                <Text style={styles.historyMeta}>
                  Décision par {item.adminName} •{' '}
                  {new Date(item.createdAt).toLocaleString('fr-FR')}
                </Text>
              </View>
            ))}

            <Text style={[styles.sectionHeading, { marginTop: Spacing.md }]}>
              Journal Complet d’Audit ({auditLogs.length})
            </Text>
            {auditLogs.map((log) => (
              <View key={log.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDoctorName}>
                    {log.targetDoctorName}
                  </Text>
                  <Text style={styles.auditTypeTag}>{log.actionType}</Text>
                </View>
                <Text style={styles.historyReason}>{log.decisionReason}</Text>
                <Text style={styles.historyMeta}>
                  Admin : {log.adminName} ({log.adminId}) •{' '}
                  {new Date(log.createdAt).toLocaleString('fr-FR')}
                </Text>
              </View>
            ))}
          </>
        ) : filteredApplications.length === 0 ? (
          <EmptyState
            icon="check-decagram-outline"
            title="Aucun dossier dans cet onglet"
            description="Toutes les candidatures de cette catégorie ont été traitées."
          />
        ) : (
          filteredApplications.map((app) => (
            <View key={app.id} style={styles.applicationCard}>
              {/* Header */}
              <View style={styles.appHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{app.fullName}</Text>
                  <Text style={styles.doctorSpecialty}>{app.specialty}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    app.verificationStatus === 'verified'
                      ? styles.statusVerified
                      : app.verificationStatus === 'rejected'
                      ? styles.statusRejected
                      : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          app.verificationStatus === 'verified'
                            ? Colors.success
                            : app.verificationStatus === 'rejected'
                            ? Colors.error
                            : '#D97706',
                      },
                    ]}
                  >
                    {app.verificationStatus === 'verified'
                      ? 'Vérifié (Public)'
                      : app.verificationStatus === 'rejected'
                      ? 'Refusé (Masqué)'
                      : 'En attente (Masqué)'}
                  </Text>
                </View>
              </View>

              {/* Professional details */}
              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <Ionicons
                    name="id-card-outline"
                    size={15}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoLabel}>N° Ordre (ONMS) :</Text>
                  <Text style={styles.infoValue}>{app.licenseNumber}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="business-outline"
                    size={15}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoLabel}>Établissement :</Text>
                  <Text style={styles.infoValue}>
                    {app.facilityName} ({app.facilityDistrict})
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoLabel}>Contact Pro :</Text>
                  <Text style={styles.infoValue}>
                    {app.professionalPhone} • {app.email}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="cash-outline"
                    size={15}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoLabel}>Tarif consultation :</Text>
                  <Text style={styles.infoValue}>
                    {app.consultationFeeFCFA.toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
              </View>

              {app.lastDecisionReason && (
                <View style={styles.decisionReasonBox}>
                  <Text style={styles.decisionReasonLabel}>
                    Dernier motif enregistré :
                  </Text>
                  <Text style={styles.decisionReasonText}>
                    {app.lastDecisionReason}
                  </Text>
                </View>
              )}

              {/* Supporting Documents (Private Bucket) */}
              <View style={styles.docsSection}>
                <Text style={styles.docsSectionTitle}>
                  Pièces justificatives ({app.documents.length}) — Bucket privé
                </Text>
                {app.documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docItem}
                    onPress={() => handleInspectDocument(doc, app.fullName)}
                  >
                    <Ionicons
                      name="document-lock-outline"
                      size={18}
                      color={Colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docLabel}>{doc.documentTitle}</Text>
                      <Text style={styles.docFileName}>
                        {doc.storagePath} ({doc.fileSizeKb} Ko)
                      </Text>
                    </View>
                    <View style={styles.inspectBtn}>
                      <Text style={styles.inspectBtnText}>Inspecter</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Admin Action Buttons */}
              <View style={styles.actionsRow}>
                {app.verificationStatus !== 'verified' && (
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => openDecisionModal(app, 'verified')}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={Colors.white}
                    />
                    <Text style={styles.approveBtnText}>Approuver</Text>
                  </TouchableOpacity>
                )}

                {app.verificationStatus !== 'rejected' && (
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => openDecisionModal(app, 'rejected')}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color={Colors.error}
                    />
                    <Text style={styles.rejectBtnText}>Refuser</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Approve / Reject Decision Modal */}
      <Modal
        visible={Boolean(selectedDoctor && decisionType)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDoctor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {decisionType === 'verified'
                ? 'Approuver le dossier médical'
                : 'Refuser le dossier médical'}
            </Text>
            <Text style={styles.modalSub}>
              Praticien : {selectedDoctor?.fullName} ({selectedDoctor?.specialty}
              )
            </Text>

            <Text style={styles.inputLabel}>
              Motif officiel de la décision (obligatoire) *
            </Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              value={decisionReason}
              onChangeText={setDecisionReason}
              placeholder="Précisez la référence ONMS vérifiée ou le motif du refus..."
              placeholderTextColor={Colors.secondaryText}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedDoctor(null)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  decisionType === 'rejected' && {
                    backgroundColor: Colors.error,
                  },
                ]}
                onPress={handleConfirmDecision}
                disabled={submitting}
              >
                <Text style={styles.modalConfirmText}>
                  {submitting
                    ? 'Validation...'
                    : decisionType === 'verified'
                    ? 'Confirmer l’approbation'
                    : 'Confirmer le refus'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Secure Document Preview Modal */}
      <Modal
        visible={Boolean(inspectedDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setInspectedDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.docModalHeader}>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.modalTitle}>
                Inspection Pièce Justificative Privée
              </Text>
            </View>

            {inspectedDoc && (
              <View style={styles.docPreviewBody}>
                <Text style={styles.docPreviewDoctor}>
                  Praticien : {inspectedDoc.doctorName}
                </Text>
                <Text style={styles.docPreviewItem}>
                  Intitulé : {inspectedDoc.document.documentTitle}
                </Text>
                <Text style={styles.docPreviewItem}>
                  Résumé : {inspectedDoc.document.summaryPreviewFr}
                </Text>
                <Text style={styles.docPreviewItem}>
                  Bucket : {inspectedDoc.document.storageBucket} (Accès privé RLS)
                </Text>
                <Text style={styles.docPreviewItem}>
                  Chemin : {inspectedDoc.document.storagePath}
                </Text>
                <Text style={styles.docPreviewUrl}>
                  URL signée temporaire (5 min) : {inspectedDoc.signedUrl}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => setInspectedDoc(null)}
            >
              <Text style={styles.modalConfirmText}>Fermer l’aperçu sécurisé</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabsBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceMuted,
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabPillTextActive: {
    color: Colors.white,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  storageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondaryLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  storageNoticeText: {
    flex: 1,
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '600',
    lineHeight: 16,
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
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  applicationCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  doctorSpecialty: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusVerified: {
    backgroundColor: '#DEF7EC',
  },
  statusRejected: {
    backgroundColor: '#FDE8E8',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoGrid: {
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.divider,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    width: 110,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  decisionReasonBox: {
    backgroundColor: Colors.surfaceMuted,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  decisionReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  decisionReasonText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
    lineHeight: 17,
  },
  docsSection: {
    marginTop: 12,
    gap: 8,
  },
  docsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  docLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  docFileName: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  inspectBtn: {
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
  },
  approveBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FDE8E8',
    paddingVertical: 11,
    borderRadius: 12,
  },
  rejectBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyDoctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  historySpecialty: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  auditTypeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 38, 36, 0.55)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: Colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  docModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  docPreviewBody: {
    backgroundColor: Colors.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  docPreviewDoctor: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  docPreviewItem: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  docPreviewUrl: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginTop: 4,
  },
});
