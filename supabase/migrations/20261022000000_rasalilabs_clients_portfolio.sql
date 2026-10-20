-- Migration: 20261022000000_rasalilabs_clients_portfolio.sql
-- Description: Ras Ali Labs Clients Portfolio schema, Row Level Security, storage policies, and initial draft records.

CREATE TABLE IF NOT EXISTS public.clients_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  work_year TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  verified_relationship BOOLEAN NOT NULL DEFAULT true,
  authorized_logo_use BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'NEEDS_REVIEW')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient ordering and status lookups
CREATE INDEX IF NOT EXISTS idx_clients_portfolio_published_order 
  ON public.clients_portfolio (display_order ASC) 
  WHERE is_published = true AND authorized_logo_use = true AND verified_relationship = true;

CREATE INDEX IF NOT EXISTS idx_clients_portfolio_status 
  ON public.clients_portfolio (status);

-- Drop previous function signature if it took arguments to eliminate user-ID oracle attacks
DROP FUNCTION IF EXISTS public.is_platform_admin(UUID);

-- Helper security definer function to check platform admin status safely from RLS policies
-- Takes NO arguments; strictly checks auth.uid() to eliminate arbitrary user-ID oracle attacks
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
      AND status = 'ACTIVE'
  );
$$;

-- Harden function execution privileges: ANON must NEVER have execute on security definer functions
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE public.clients_portfolio ENABLE ROW LEVEL SECURITY;

-- 1. Public Anonymous & Authenticated Read Policy:
-- Public can ONLY view published client records where authorized_logo_use is explicitly true,
-- the client relationship is verified, and the record is PUBLISHED.
-- No draft, archived, unverified, or review records are exposed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients_portfolio' 
      AND policyname = 'Public read published authorized clients'
  ) THEN
    DROP POLICY "Public read published authorized clients" ON public.clients_portfolio;
  END IF;

  CREATE POLICY "Public read published authorized clients"
    ON public.clients_portfolio
    FOR SELECT
    TO anon, authenticated
    USING (is_published = true AND authorized_logo_use = true AND verified_relationship = true AND status = 'PUBLISHED');
END $$;

-- 2. Platform Admin Read Policy:
-- Active Platform Administrators can view all records (drafts, pending review, published, archived).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients_portfolio' 
      AND policyname = 'Platform admins read all clients'
  ) THEN
    CREATE POLICY "Platform admins read all clients"
      ON public.clients_portfolio
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin());
  END IF;
END $$;

-- 3. Platform Admin Write Policies (INSERT, UPDATE, DELETE):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients_portfolio' 
      AND policyname = 'Platform admins insert clients'
  ) THEN
    CREATE POLICY "Platform admins insert clients"
      ON public.clients_portfolio
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients_portfolio' 
      AND policyname = 'Platform admins update clients'
  ) THEN
    CREATE POLICY "Platform admins update clients"
      ON public.clients_portfolio
      FOR UPDATE
      TO authenticated
      USING (public.is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients_portfolio' 
      AND policyname = 'Platform admins delete clients'
  ) THEN
    CREATE POLICY "Platform admins delete clients"
      ON public.clients_portfolio
      FOR DELETE
      TO authenticated
      USING (public.is_platform_admin());
  END IF;
END $$;

-- Table Grants
GRANT SELECT ON TABLE public.clients_portfolio TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients_portfolio TO authenticated;
GRANT ALL ON TABLE public.clients_portfolio TO service_role;

-- Public Storage Bucket for client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'client-logos' bucket:
-- Public can read client logos; only verified platform admins can upload, replace, or delete.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    GRANT USAGE ON SCHEMA storage TO anon, authenticated;
    GRANT SELECT ON TABLE storage.objects TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO authenticated;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public read client logos'
    ) THEN
      CREATE POLICY "Public read client logos"
        ON storage.objects
        FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'client-logos');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Platform admins upload client logos'
    ) THEN
      CREATE POLICY "Platform admins upload client logos"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'client-logos' AND public.is_platform_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Platform admins update client logos'
    ) THEN
      CREATE POLICY "Platform admins update client logos"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'client-logos' AND public.is_platform_admin())
        WITH CHECK (bucket_id = 'client-logos' AND public.is_platform_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Platform admins delete client logos'
    ) THEN
      CREATE POLICY "Platform admins delete client logos"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'client-logos' AND public.is_platform_admin());
    END IF;
  END IF;
END $$;

-- Seed discovered clients: ALL initially DRAFT or NEEDS_REVIEW, unpublished, unauthorized pending administrative approval
INSERT INTO public.clients_portfolio (id, name, logo_url, work_year, display_order, is_published, verified_relationship, authorized_logo_use, status, notes)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Pula Pitch', '/assets/images/pula-pitch-logo.jpg', '2024', 1, false, true, false, 'DRAFT', '13-episode Botswana television series with lead videography, set design, pre-production and post-production. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000002', 'The Melody Gospel TV Show', '/assets/images/melody-logo.jpg', '2015–2022', 2, false, true, false, 'DRAFT', 'Long-running gospel television production with music direction, sound engineering, rehearsal and performance planning. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000003', 'Pameltex', '/assets/images/pameltex-logo.png', '2023', 3, false, true, false, 'DRAFT', 'Industrial digital platform at pameltex.com, responsive corporate platform with product information architecture. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000004', 'Lebville Boutique', '/assets/images/lebville-logo.png', '2024', 4, false, true, false, 'DRAFT', 'Fashion boutique storefront and responsive e-commerce platform at lebvilleboutique.com. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000005', 'Eagle Touch Tours', '/assets/images/eagle-touch-logo.png', '2023–2024', 5, false, true, false, 'DRAFT', 'Victoria Falls travel and tourism website at eagletouchtours.com. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000006', 'BB Travel Tours', '/assets/images/bb-travel-logo.jpg', '2023–2024', 6, false, true, false, 'DRAFT', 'Victoria Falls activities and travel services platform at bbtraveltours.com. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000007', 'Peregrine Tours and Safaris', '/assets/images/peregrine-logo.png', '2024', 7, false, true, false, 'DRAFT', 'Tours and safari digital platform delivering travel services presentation and destination experiences. Awaiting admin logo use signoff and publishing approval.'),
  ('c1000000-0000-0000-0000-000000000008', 'Safari Butler', '/assets/images/safari-butler-logo.jpg', 'Year Unverified', 8, false, true, false, 'NEEDS_REVIEW', 'Logo asset in repo; requires verification of completion date and public display authorization before publishing.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  work_year = EXCLUDED.work_year,
  display_order = EXCLUDED.display_order,
  is_published = EXCLUDED.is_published,
  verified_relationship = EXCLUDED.verified_relationship,
  authorized_logo_use = EXCLUDED.authorized_logo_use,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();
