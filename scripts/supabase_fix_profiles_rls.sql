-- =====================================================================
-- Supabase Migration: Fix Profiles & Social Account Tokens RLS
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yidsfihagwttlmhfynmf/sql
-- =====================================================================

-- 1. Ensure public.profiles table exists with proper schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Ensure all required columns exist even if profiles table was previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;

-- Create comprehensive, permissive policies for profiles
CREATE POLICY "Allow public read access to profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow users to insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Automatically create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL),
    new.email,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for all existing auth users
INSERT INTO public.profiles (id, full_name, avatar_url, email, updated_at)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', NULL),
  email,
  now()
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure social_account_tokens table exists and has proper RLS
CREATE TABLE IF NOT EXISTS public.social_account_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL
);

-- Ensure all required columns exist on social_account_tokens
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS account_label TEXT;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS account_handle TEXT;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS scopes TEXT[] DEFAULT '{}';
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.social_account_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Ensure unique constraint exists on user_id and provider
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_account_tokens_user_id_provider_key'
  ) THEN
    ALTER TABLE public.social_account_tokens ADD CONSTRAINT social_account_tokens_user_id_provider_key UNIQUE (user_id, provider);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tokens" ON public.social_account_tokens;
DROP POLICY IF EXISTS "Users can read own tokens" ON public.social_account_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.social_account_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON public.social_account_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON public.social_account_tokens;

CREATE POLICY "Users can manage own tokens"
  ON public.social_account_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_social_tokens_user_id ON public.social_account_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_social_tokens_user_provider ON public.social_account_tokens(user_id, provider);

-- 3. Grant PostgREST schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.social_account_tokens TO authenticated, service_role;

