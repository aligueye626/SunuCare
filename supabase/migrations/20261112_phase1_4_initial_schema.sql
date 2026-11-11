-- =============================================================================
-- SUNUCARE — PHASES 1 À 4 : SCHÉMA INITIAL (PROFILES, DOCTOR_DETAILS, AVAILABILITY)
-- À exécuter EN PREMIER dans le SQL Editor de Supabase avant les phases 5, 6 et 7
-- =============================================================================

-- 1. Table des profils utilisateurs (Patient, Médecin, Admin interne)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  district TEXT DEFAULT 'Dakar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des profils de base" ON public.profiles;
CREATE POLICY "Lecture publique des profils de base"
  ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Mise à jour de son propre profil" ON public.profiles;
CREATE POLICY "Mise à jour de son propre profil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "Création de son propre profil à l'inscription" ON public.profiles;
CREATE POLICY "Création de son propre profil à l'inscription"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id AND role IN ('patient', 'doctor'));

-- 2. Table des profils professionnels des médecins (Dakar, Sénégal)
CREATE TABLE IF NOT EXISTS public.doctor_details (
  id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT,
  specialty TEXT NOT NULL,
  sub_specialties TEXT[] DEFAULT '{}',
  license_number TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_publicly_searchable BOOLEAN NOT NULL DEFAULT false,
  clinic_name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Plateau',
  city TEXT NOT NULL DEFAULT 'Dakar',
  consultation_fee INTEGER NOT NULL DEFAULT 20000 CHECK (consultation_fee >= 0),
  consultation_types TEXT[] DEFAULT ARRAY['in_person'],
  experience_years INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  professional_phone TEXT,
  public_email TEXT,
  avatar_url TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  next_available_slot TEXT DEFAULT 'Demain à 09:00',
  available_dates TEXT[] DEFAULT '{}',
  working_hours_summary TEXT DEFAULT 'Lun - Ven : 08:30 - 17:30',
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_details ENABLE ROW LEVEL SECURITY;

-- Seuls les médecins vérifiés sont visibles publiquement (ou le médecin lui-même)
DROP POLICY IF EXISTS "Lecture publique des médecins vérifiés uniquement" ON public.doctor_details;
CREATE POLICY "Lecture publique des médecins vérifiés uniquement"
  ON public.doctor_details
  FOR SELECT
  USING (
    (verification_status = 'verified' AND is_publicly_searchable = true)
    OR auth.uid()::text = id
  );

DROP POLICY IF EXISTS "Insertion dossier médecin en attente" ON public.doctor_details;
CREATE POLICY "Insertion dossier médecin en attente"
  ON public.doctor_details
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = id
    AND verification_status = 'pending'
    AND is_publicly_searchable = false
  );

DROP POLICY IF EXISTS "Mise à jour profil par le médecin propriétaire" ON public.doctor_details;
CREATE POLICY "Mise à jour profil par le médecin propriétaire"
  ON public.doctor_details
  FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- 3. Table de configuration des disponibilités et congés des médecins
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  doctor_id TEXT PRIMARY KEY REFERENCES public.doctor_details(id) ON DELETE CASCADE,
  consultation_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (consultation_duration_minutes IN (15, 20, 30, 45, 60)),
  is_vacation_mode BOOLEAN NOT NULL DEFAULT false,
  weekly_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_periods JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_available_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des disponibilités médecins" ON public.doctor_availability;
CREATE POLICY "Lecture publique des disponibilités médecins"
  ON public.doctor_availability
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Modification des disponibilités par le médecin propriétaire" ON public.doctor_availability;
CREATE POLICY "Modification des disponibilités par le médecin propriétaire"
  ON public.doctor_availability
  FOR ALL
  USING (auth.uid()::text = doctor_id)
  WITH CHECK (auth.uid()::text = doctor_id);

