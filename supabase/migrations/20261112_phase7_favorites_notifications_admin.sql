-- ============================================================================
-- SUNUCARE — PHASE 7: FAVORITES, NOTIFICATIONS, ADMINISTRATION & VERIFICATION
-- Target: Dakar, Senegal (Currency: FCFA / XOF)
-- ============================================================================

-- 1. Upgrade profiles role constraint to support internal 'admin' role
-- Note: Public registration trigger strictly restricts self-registration to 'patient' and 'doctor'
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('patient', 'doctor', 'admin'));

-- Trigger preventing public users from self-assigning 'admin' role on INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Public signups via Supabase Auth cannot self-assign 'admin'
    IF NEW.role = 'admin' AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'SECURITY_VIOLATION: L''inscription publique est réservée aux comptes Patient et Médecin.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role <> OLD.role AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'SECURITY_VIOLATION: Modification du rôle utilisateur interdite.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_role_escalation();

-- Trusted server-side function to assign ADMIN privileges (executable ONLY by service_role)
CREATE OR REPLACE FUNCTION public.assign_admin_role_internal(p_target_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Seul le serveur interne peut attribuer le rôle ADMIN.';
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_admin_role_internal(TEXT) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- PART 1: PATIENT FAVORITES TABLE (WITH DUPLICATE PREVENTION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_favorites (
  id TEXT PRIMARY KEY DEFAULT ('fav_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6)),
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL REFERENCES public.doctor_details(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_patient_favorite_doctor UNIQUE (patient_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_favorites_patient
  ON public.patient_favorites (patient_id, created_at DESC);

ALTER TABLE public.patient_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage their own favorites" ON public.patient_favorites;
CREATE POLICY "Patients manage their own favorites"
  ON public.patient_favorites
  FOR ALL
  USING (auth.uid()::text = patient_id)
  WITH CHECK (auth.uid()::text = patient_id);

-- ============================================================================
-- PART 2: IN-APP NOTIFICATIONS TABLE (RECIPIENT-ONLY ACCESS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6)),
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'appointment_request_received',
      'appointment_confirmed',
      'appointment_rejected',
      'appointment_cancelled',
      'appointment_reminder',
      'doctor_verification_update'
    )
  ),
  related_appointment_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_id, is_read)
  WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recipient-only SELECT and UPDATE policy
DROP POLICY IF EXISTS "Recipients can view only their own notifications" ON public.notifications;
CREATE POLICY "Recipients can view only their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid()::text = recipient_id);

DROP POLICY IF EXISTS "Recipients can mark only their own notifications as read" ON public.notifications;
CREATE POLICY "Recipients can mark only their own notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid()::text = recipient_id)
  WITH CHECK (auth.uid()::text = recipient_id);

-- ============================================================================
-- PART 3 & 4: DOCTOR VERIFICATION DOCUMENTS, HISTORY & ADMIN AUDIT LOGS
-- ============================================================================

-- Private supporting documents metadata table (files stored in private bucket 'doctor-verification-documents')
CREATE TABLE IF NOT EXISTS public.doctor_verification_documents (
  id TEXT PRIMARY KEY DEFAULT ('docfile_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6)),
  doctor_id TEXT NOT NULL REFERENCES public.doctor_details(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'medical_diploma',
      'ordre_medecins_certificate',
      'national_id',
      'practice_authorization'
    )
  ),
  document_title TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'doctor-verification-documents',
  storage_path TEXT NOT NULL,
  file_size_kb INTEGER NOT NULL DEFAULT 420,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_verification_documents ENABLE ROW LEVEL SECURITY;

-- Only the owning doctor or an internal ADMIN can view verification document records
DROP POLICY IF EXISTS "Admin or owner can access verification documents" ON public.doctor_verification_documents;
CREATE POLICY "Admin or owner can access verification documents"
  ON public.doctor_verification_documents
  FOR SELECT
  USING (
    auth.uid()::text = doctor_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- Administrative Audit Logs & Verification History Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('audit_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6)),
  admin_id TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'doctor_verification_approved',
      'doctor_verification_rejected',
      'doctor_document_reviewed'
    )
  ),
  target_doctor_id TEXT NOT NULL,
  target_doctor_name TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  decision_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_doctor
  ON public.admin_audit_logs (target_doctor_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Strictly only ADMIN users can read audit logs
DROP POLICY IF EXISTS "Only admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Only admins can read audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'admin'
    )
  );

-- Atomic Server-Side RPC for Admin Doctor Verification Review
CREATE OR REPLACE FUNCTION public.admin_review_doctor_verification(
  p_admin_id TEXT,
  p_doctor_id TEXT,
  p_decision TEXT, -- 'verified' | 'rejected'
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_doctor RECORD;
  v_prev_status TEXT;
  v_is_searchable BOOLEAN;
  v_audit_id TEXT;
BEGIN
  -- 1. Verify caller is a legitimate ADMIN
  SELECT * INTO v_admin
  FROM public.profiles
  WHERE id = p_admin_id AND role = 'admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ADMIN: Accès refusé. Seul un administrateur interne peut valider ou rejeter un dossier médical.';
  END IF;

  -- 2. Prevent self-approval under any circumstance
  IF p_admin_id = p_doctor_id THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Un praticien ne peut jamais valider son propre dossier.';
  END IF;

  IF p_decision NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION: La décision doit être "verified" ou "rejected".';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'REASON_REQUIRED: Un motif de décision administrative est obligatoire.';
  END IF;

  -- 3. Lock target doctor row
  SELECT * INTO v_doctor
  FROM public.doctor_details
  WHERE id = p_doctor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DOCTOR_NOT_FOUND: Dossier médecin introuvable.';
  END IF;

  v_prev_status := COALESCE(v_doctor.verification_status, 'pending');
  v_is_searchable := (p_decision = 'verified');

  -- 4. Update doctor verification status and public searchability
  UPDATE public.doctor_details
  SET
    verification_status = p_decision,
    is_publicly_searchable = v_is_searchable
  WHERE id = p_doctor_id;

  -- 5. Record immutable administrative audit log
  v_audit_id := 'audit_' || extract(epoch from clock_timestamp())::bigint::text || '_' || substr(md5(random()::text), 1, 4);

  INSERT INTO public.admin_audit_logs (
    id,
    admin_id,
    admin_name,
    action_type,
    target_doctor_id,
    target_doctor_name,
    previous_status,
    new_status,
    decision_reason
  ) VALUES (
    v_audit_id,
    p_admin_id,
    COALESCE(v_admin.full_name, 'Administrateur SunuCare'),
    CASE WHEN p_decision = 'verified' THEN 'doctor_verification_approved' ELSE 'doctor_verification_rejected' END,
    p_doctor_id,
    COALESCE(v_doctor.full_name, 'Dr. Praticien'),
    v_prev_status,
    p_decision,
    trim(p_reason)
  );

  -- 6. Send automatic notification to the doctor
  INSERT INTO public.notifications (
    recipient_id,
    title,
    message,
    notification_type
  ) VALUES (
    p_doctor_id,
    CASE
      WHEN p_decision = 'verified' THEN 'Profil professionnel approuvé et vérifié'
      ELSE 'Mise à jour de votre demande de vérification'
    END,
    CASE
      WHEN p_decision = 'verified' THEN 'Félicitations ! Votre dossier professionnel a été validé par l''Administration SunuCare (' || trim(p_reason) || '). Votre profil est désormais visible dans les recherches publiques à Dakar.'
      ELSE 'Votre dossier de vérification n''a pas pu être validé pour le motif suivant : ' || trim(p_reason) || '.'
    END,
    'doctor_verification_update'
  );

  RETURN jsonb_build_object(
    'doctor_id', p_doctor_id,
    'previous_status', v_prev_status,
    'new_status', p_decision,
    'is_publicly_searchable', v_is_searchable,
    'audit_id', v_audit_id
  );
END;
$$;

