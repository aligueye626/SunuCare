-- ============================================================================
-- SUNUCARE — PHASE 6: TRANSACTIONAL APPOINTMENT BOOKING & STATUS MANAGEMENT
-- Target: Dakar, Senegal (Currency: FCFA / XOF)
-- ============================================================================

-- 1. Create or upgrade the appointments table with strict constraints
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY DEFAULT ('apt_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6)),
  reference_code TEXT NOT NULL UNIQUE DEFAULT ('SC-DKR-' || upper(substr(md5(random()::text), 1, 6))),
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL DEFAULT 'Patient SunuCare',
  patient_phone TEXT NOT NULL DEFAULT '+221 77 000 00 00',
  doctor_id TEXT NOT NULL REFERENCES public.doctor_details(id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  doctor_specialty TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  clinic_address TEXT,
  district TEXT NOT NULL DEFAULT 'Plateau',
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL CHECK (appointment_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  consultation_type TEXT NOT NULL DEFAULT 'in_person' CHECK (consultation_type IN ('in_person', 'teleconsultation')),
  fee_fcfa INTEGER NOT NULL DEFAULT 20000 CHECK (fee_fcfa >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  reason TEXT,
  notes TEXT,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  cancelled_by TEXT CHECK (cancelled_by IS NULL OR cancelled_by IN ('patient', 'doctor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Ensure new columns exist if table was created in an earlier phase
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reference_code TEXT DEFAULT ('SC-DKR-' || upper(substr(md5(random()::text), 1, 6))),
  ADD COLUMN IF NOT EXISTS clinic_address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. Database-level Partial Unique Indexes to prevent double bookings & duplicate reservations
-- Prevent more than one active ('pending' or 'confirmed') booking for the same doctor, date, and time slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_doctor_active_slot
  ON public.appointments (doctor_id, appointment_date, appointment_time)
  WHERE status IN ('pending', 'confirmed');

-- Prevent a patient from having duplicate active reservations at the same date and time
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_patient_active_slot
  ON public.appointments (patient_id, appointment_date, appointment_time)
  WHERE status IN ('pending', 'confirmed');

-- Performance indexes for patient & doctor queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date
  ON public.appointments (patient_id, appointment_date DESC, appointment_time ASC);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status
  ON public.appointments (doctor_id, appointment_date ASC, status);

-- 3. Trigger to protect confirmed appointments from accidental deletion and enforce valid status transitions
CREATE OR REPLACE FUNCTION public.enforce_appointment_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent deletion of confirmed or completed appointments
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('confirmed', 'completed') THEN
      RAISE EXCEPTION 'PROTECTION_ERROR: Un rendez-vous confirmé ou terminé ne peut jamais être supprimé.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Prevent changing immutable core fields of a confirmed appointment (doctor, patient, date, time)
    IF OLD.status = 'confirmed' AND (
      NEW.doctor_id <> OLD.doctor_id OR
      NEW.patient_id <> OLD.patient_id OR
      NEW.appointment_date <> OLD.appointment_date OR
      NEW.appointment_time <> OLD.appointment_time
    ) THEN
      RAISE EXCEPTION 'PROTECTION_ERROR: Un rendez-vous confirmé ne peut pas être écrasé ou déplacé sans annulation préalable.';
    END IF;

    -- Enforce controlled status transitions
    IF OLD.status <> NEW.status THEN
      IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: Transition non autorisée de % vers %.', OLD.status, NEW.status;
      ELSIF OLD.status = 'confirmed' AND NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: Transition non autorisée de % vers %.', OLD.status, NEW.status;
      ELSIF OLD.status IN ('rejected', 'cancelled', 'completed') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: Le statut % est final et ne peut plus être modifié.', OLD.status;
      END IF;

      -- Set audit timestamps
      IF NEW.status = 'confirmed' THEN
        NEW.confirmed_at := now();
      ELSIF NEW.status = 'completed' THEN
        NEW.completed_at := now();
      ELSIF NEW.status IN ('cancelled', 'rejected') THEN
        NEW.cancelled_at := now();
      END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_appointment_integrity ON public.appointments;
CREATE TRIGGER trg_enforce_appointment_integrity
  BEFORE UPDATE OR DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_appointment_integrity();

-- 4. Atomic PostgreSQL Function for Creating an Appointment (Booking Security)
CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_patient_id TEXT,
  p_patient_name TEXT,
  p_patient_phone TEXT,
  p_doctor_id TEXT,
  p_appointment_date DATE,
  p_appointment_time TEXT,
  p_consultation_type TEXT DEFAULT 'in_person',
  p_reason TEXT DEFAULT 'Consultation médicale programmée'
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor RECORD;
  v_conflict_count INTEGER;
  v_patient_dup_count INTEGER;
  v_reference_code TEXT;
  v_new_appointment public.appointments;
BEGIN
  -- 1. Validate required inputs & time format
  IF p_patient_id IS NULL OR trim(p_patient_id) = '' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Identifiant patient requis pour réserver.';
  END IF;

  IF p_appointment_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'PAST_DATE: Impossible de réserver un rendez-vous à une date passée.';
  END IF;

  IF p_appointment_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'INVALID_SLOT: Format de créneau horaire invalide (%).', p_appointment_time;
  END IF;

  -- 2. Lock and verify doctor row (must be verified and publicly searchable)
  SELECT *
  INTO v_doctor
  FROM public.doctor_details
  WHERE id = p_doctor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DOCTOR_NOT_FOUND: Praticien introuvable.';
  END IF;

  IF v_doctor.verification_status <> 'verified' OR COALESCE(v_doctor.is_publicly_searchable, true) = false THEN
    RAISE EXCEPTION 'UNVERIFIED_DOCTOR: Ce praticien n''est pas encore vérifié et ne peut pas recevoir de réservations.';
  END IF;

  -- 3. Validate consultation type against doctor's supported types
  IF v_doctor.consultation_types IS NOT NULL AND array_length(v_doctor.consultation_types, 1) > 0 THEN
    IF NOT (p_consultation_type = ANY(v_doctor.consultation_types)) THEN
      RAISE EXCEPTION 'INVALID_CONSULTATION_TYPE: Ce praticien ne propose pas ce mode de consultation.';
    END IF;
  END IF;

  -- 4. Check for existing active reservation on this doctor's slot (atomic check inside lock)
  SELECT count(*)
  INTO v_conflict_count
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND appointment_date = p_appointment_date
    AND appointment_time = p_appointment_time
    AND status IN ('pending', 'confirmed');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_ALREADY_BOOKED: Ce créneau horaire vient d''être réservé par un autre patient.';
  END IF;

  -- 5. Check for duplicate active reservation by the same patient at the same date & time
  SELECT count(*)
  INTO v_patient_dup_count
  FROM public.appointments
  WHERE patient_id = p_patient_id
    AND appointment_date = p_appointment_date
    AND appointment_time = p_appointment_time
    AND status IN ('pending', 'confirmed');

  IF v_patient_dup_count > 0 THEN
    RAISE EXCEPTION 'DUPLICATE_RESERVATION: Vous avez déjà une réservation active sur ce créneau horaire.';
  END IF;

  -- 6. Generate unique reference code and insert appointment
  v_reference_code := 'SC-DKR-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO public.appointments (
    id,
    reference_code,
    patient_id,
    patient_name,
    patient_phone,
    doctor_id,
    doctor_name,
    doctor_specialty,
    clinic_name,
    clinic_address,
    district,
    appointment_date,
    appointment_time,
    consultation_type,
    fee_fcfa,
    status,
    reason
  ) VALUES (
    'apt_' || extract(epoch from clock_timestamp())::bigint::text || '_' || substr(md5(random()::text), 1, 4),
    v_reference_code,
    p_patient_id,
    COALESCE(NULLIF(trim(p_patient_name), ''), 'Patient SunuCare'),
    COALESCE(NULLIF(trim(p_patient_phone), ''), '+221 77 000 00 00'),
    p_doctor_id,
    v_doctor.full_name,
    v_doctor.specialty,
    COALESCE(v_doctor.clinic_name, 'Cabinet Médical Dakar'),
    COALESCE(v_doctor.address, v_doctor.district || ', Dakar'),
    COALESCE(v_doctor.district, 'Plateau'),
    p_appointment_date,
    p_appointment_time,
    p_consultation_type,
    COALESCE(v_doctor.consultation_fee, 20000),
    'pending',
    COALESCE(NULLIF(trim(p_reason), ''), 'Consultation médicale programmée')
  )
  RETURNING * INTO v_new_appointment;

  RETURN v_new_appointment;
END;
$$;

-- 5. Atomic PostgreSQL Function for Controlled Status Transitions with Role Authorization
CREATE OR REPLACE FUNCTION public.transition_appointment_status(
  p_appointment_id TEXT,
  p_actor_id TEXT,
  p_actor_role TEXT, -- 'patient' | 'doctor'
  p_new_status TEXT, -- 'confirmed' | 'rejected' | 'cancelled' | 'completed'
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt public.appointments;
  v_conflict_count INTEGER;
  v_updated public.appointments;
BEGIN
  -- Lock target appointment row
  SELECT *
  INTO v_apt
  FROM public.appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Rendez-vous introuvable.';
  END IF;

  -- Role & Ownership Authorization
  IF p_actor_role = 'patient' THEN
    IF v_apt.patient_id <> p_actor_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Vous ne pouvez gérer que vos propres rendez-vous.';
    END IF;
    IF p_new_status <> 'cancelled' THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Un patient peut uniquement annuler un rendez-vous.';
    END IF;
  ELSIF p_actor_role = 'doctor' THEN
    IF v_apt.doctor_id <> p_actor_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Ce rendez-vous appartient à un autre praticien.';
    END IF;
    IF p_new_status NOT IN ('confirmed', 'rejected', 'cancelled', 'completed') THEN
      RAISE EXCEPTION 'INVALID_STATUS: Statut cible invalide.';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED: Rôle utilisateur non reconnu.';
  END IF;

  -- If confirming, verify no other confirmed appointment exists on the same slot
  IF p_new_status = 'confirmed' THEN
    SELECT count(*)
    INTO v_conflict_count
    FROM public.appointments
    WHERE id <> v_apt.id
      AND doctor_id = v_apt.doctor_id
      AND appointment_date = v_apt.appointment_date
      AND appointment_time = v_apt.appointment_time
      AND status = 'confirmed';

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'SLOT_CONFLICT: Un autre rendez-vous est déjà confirmé sur ce créneau.';
    END IF;
  END IF;

  -- Perform update (trigger enforces valid state transitions and timestamps)
  UPDATE public.appointments
  SET
    status = p_new_status,
    rejection_reason = CASE WHEN p_new_status = 'rejected' THEN COALESCE(NULLIF(trim(p_reason), ''), 'Créneau indisponible au planning du praticien') ELSE rejection_reason END,
    cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN COALESCE(NULLIF(trim(p_reason), ''), 'Rendez-vous annulé') ELSE cancellation_reason END,
    cancelled_by = CASE WHEN p_new_status IN ('cancelled', 'rejected') THEN p_actor_role ELSE cancelled_by END,
    notes = COALESCE(NULLIF(trim(p_notes), ''), notes)
  WHERE id = p_appointment_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

