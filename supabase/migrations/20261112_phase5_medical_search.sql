-- =============================================================================
-- SUNUCARE — PHASE 5: MEDICAL SEARCH ENGINE & DOCTOR/FACILITY PROFILES (DAKAR)
-- PostgreSQL Extensions, Indexes, and Server-Side Paginated Search RPC
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Ensure facilities table exists for Dakar healthcare structures
CREATE TABLE IF NOT EXISTS public.facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('clinique', 'hopital', 'centre_medical', 'laboratoire')),
  district TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Dakar',
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  description TEXT,
  rating NUMERIC(3,2) DEFAULT 4.7,
  review_count INTEGER DEFAULT 0,
  available_specialties TEXT[] DEFAULT '{}',
  available_services TEXT[] DEFAULT '{}',
  is_open_24h BOOLEAN DEFAULT false,
  emergency_available BOOLEAN DEFAULT false,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enhance doctor_details columns for Phase 5 search & profile requirements
ALTER TABLE IF EXISTS public.doctor_details
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS facility_id TEXT REFERENCES public.facilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_specialties TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consultation_types TEXT[] DEFAULT ARRAY['in_person'],
  ADD COLUMN IF NOT EXISTS public_email TEXT,
  ADD COLUMN IF NOT EXISTS professional_phone TEXT,
  ADD COLUMN IF NOT EXISTS next_available_slot TEXT,
  ADD COLUMN IF NOT EXISTS available_dates TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS working_hours_summary TEXT;

-- 3. Performance Indexes for Server-Side Search (No full-table downloads)
CREATE INDEX IF NOT EXISTS idx_doctor_details_verified_public
  ON public.doctor_details (verification_status, is_publicly_searchable)
  WHERE verification_status = 'verified' AND is_publicly_searchable = true;

CREATE INDEX IF NOT EXISTS idx_doctor_details_district
  ON public.doctor_details (district);

CREATE INDEX IF NOT EXISTS idx_doctor_details_specialty
  ON public.doctor_details (specialty);

CREATE INDEX IF NOT EXISTS idx_doctor_details_fee
  ON public.doctor_details (consultation_fee);

CREATE INDEX IF NOT EXISTS idx_doctor_details_consultation_types
  ON public.doctor_details USING GIN (consultation_types);

CREATE INDEX IF NOT EXISTS idx_doctor_details_available_dates
  ON public.doctor_details USING GIN (available_dates);

CREATE INDEX IF NOT EXISTS idx_doctor_details_trgm_search
  ON public.doctor_details USING GIN (
    (COALESCE(full_name, '') || ' ' || COALESCE(specialty, '') || ' ' || COALESCE(clinic_name, '') || ' ' || COALESCE(district, '')) gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_facilities_district
  ON public.facilities (district);

CREATE INDEX IF NOT EXISTS idx_facilities_trgm_name
  ON public.facilities USING GIN (name gin_trgm_ops);

-- 4. Server-Side Ranked & Paginated Medical Search Function
CREATE OR REPLACE FUNCTION public.search_verified_doctors(
  p_query TEXT DEFAULT '',
  p_specialty TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_consultation_type TEXT DEFAULT NULL,
  p_available_date TEXT DEFAULT NULL,
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  specialty TEXT,
  sub_specialties TEXT[],
  facility_id TEXT,
  clinic_name TEXT,
  address TEXT,
  district TEXT,
  city TEXT,
  consultation_fee INTEGER,
  consultation_types TEXT[],
  public_email TEXT,
  professional_phone TEXT,
  bio TEXT,
  rating NUMERIC,
  review_count INTEGER,
  avatar_url TEXT,
  verification_status TEXT,
  next_available_slot TEXT,
  available_dates TEXT[],
  working_hours_summary TEXT,
  experience_years INTEGER,
  relevance_score NUMERIC,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_query TEXT := lower(unaccent(trim(COALESCE(p_query, ''))));
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      d.id,
      d.full_name,
      d.specialty,
      d.sub_specialties,
      d.facility_id,
      d.clinic_name,
      d.address,
      d.district,
      d.city,
      d.consultation_fee,
      d.consultation_types,
      d.public_email,
      d.professional_phone,
      d.bio,
      d.rating,
      d.review_count,
      d.avatar_url,
      d.verification_status,
      d.next_available_slot,
      d.available_dates,
      d.working_hours_summary,
      d.experience_years,
      (
        CASE
          WHEN v_clean_query = '' THEN 1.0
          WHEN lower(unaccent(COALESCE(d.full_name, ''))) LIKE '%' || v_clean_query || '%' THEN 100.0
          WHEN lower(unaccent(COALESCE(d.specialty, ''))) LIKE '%' || v_clean_query || '%' THEN 90.0
          WHEN lower(unaccent(COALESCE(d.clinic_name, ''))) LIKE '%' || v_clean_query || '%' THEN 75.0
          WHEN lower(unaccent(COALESCE(d.district, ''))) LIKE '%' || v_clean_query || '%' THEN 70.0
          ELSE similarity(
            lower(unaccent(COALESCE(d.full_name, '') || ' ' || COALESCE(d.specialty, '') || ' ' || COALESCE(d.clinic_name, '') || ' ' || COALESCE(d.district, ''))),
            v_clean_query
          ) * 60.0
        END
        + COALESCE(d.rating, 4.5) * 2.0
      )::NUMERIC AS score
    FROM public.doctor_details d
    WHERE d.verification_status = 'verified'
      AND d.is_publicly_searchable = true
      AND (p_specialty IS NULL OR p_specialty = 'Tous' OR lower(unaccent(d.specialty)) LIKE '%' || lower(unaccent(p_specialty)) || '%')
      AND (p_district IS NULL OR p_district = 'Tous' OR lower(unaccent(d.district)) LIKE '%' || lower(unaccent(p_district)) || '%')
      AND (p_consultation_type IS NULL OR p_consultation_type = 'all' OR p_consultation_type = ANY(d.consultation_types))
      AND (p_available_date IS NULL OR p_available_date = 'any' OR p_available_date = ANY(d.available_dates))
      AND (p_min_price IS NULL OR d.consultation_fee >= p_min_price)
      AND (p_max_price IS NULL OR d.consultation_fee <= p_max_price)
      AND (
        v_clean_query = ''
        OR lower(unaccent(COALESCE(d.full_name, ''))) LIKE '%' || v_clean_query || '%'
        OR lower(unaccent(COALESCE(d.specialty, ''))) LIKE '%' || v_clean_query || '%'
        OR lower(unaccent(COALESCE(d.clinic_name, ''))) LIKE '%' || v_clean_query || '%'
        OR lower(unaccent(COALESCE(d.district, ''))) LIKE '%' || v_clean_query || '%'
        OR similarity(
          lower(unaccent(COALESCE(d.full_name, '') || ' ' || COALESCE(d.specialty, '') || ' ' || COALESCE(d.clinic_name, '') || ' ' || COALESCE(d.district, ''))),
          v_clean_query
        ) > 0.18
      )
  )
  SELECT
    f.id,
    f.full_name,
    f.specialty,
    f.sub_specialties,
    f.facility_id,
    f.clinic_name,
    f.address,
    f.district,
    f.city,
    f.consultation_fee,
    f.consultation_types,
    f.public_email,
    f.professional_phone,
    f.bio,
    f.rating,
    f.review_count,
    f.avatar_url,
    f.verification_status,
    f.next_available_slot,
    f.available_dates,
    f.working_hours_summary,
    f.experience_years,
    f.score AS relevance_score,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.score DESC, f.rating DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

