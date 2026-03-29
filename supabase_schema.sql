-- ============================================================
-- SUPABASE SCHEMA: App Control Horario
-- Run this entire script in the Supabase SQL Editor.
-- ============================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Profiles table (linked to Supabase Auth)
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries table
CREATE TABLE public.time_entries (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_type     TEXT NOT NULL CHECK (entry_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Index for fast lookups by user + date
CREATE INDEX idx_time_entries_user_date ON public.time_entries(user_id, reference_date, created_at);

-- ============================================================
-- 3. SERVER-SIDE FUNCTION (prevents client timestamp manipulation)
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_time_entry(p_entry_type TEXT)
RETURNS public.time_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result  public.time_entries;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate entry_type
  IF p_entry_type NOT IN ('clock_in', 'clock_out', 'break_start', 'break_end') THEN
    RAISE EXCEPTION 'Invalid entry_type: %', p_entry_type;
  END IF;
  
  -- Insert using server-side now() — client cannot manipulate timestamp
  INSERT INTO public.time_entries (user_id, entry_type, created_at, reference_date)
  VALUES (v_user_id, p_entry_type, now(), CURRENT_DATE)
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================
-- 4. TRIGGER: Auto-create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- PROFILES: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- TIME_ENTRIES: Users can only SELECT their own entries
CREATE POLICY "Users can view own time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

-- TIME_ENTRIES: Users can only INSERT entries for themselves
CREATE POLICY "Users can insert own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- TIME_ENTRIES: No UPDATE or DELETE policies = blocked by default with RLS enabled
-- This prevents users from modifying or deleting past records (fraud prevention).
