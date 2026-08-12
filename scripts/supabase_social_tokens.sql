-- ============================================================
-- Ralion Growth OS -- Social Account Tokens Table
-- Run this in Supabase SQL Editor -> New Query -> Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.social_account_tokens (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL,
  encrypted_access_token  TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at              TIMESTAMPTZ,
  scopes                  TEXT[],
  account_handle          TEXT,
  account_label           TEXT,
  followers_count         BIGINT DEFAULT 0,
  avatar_url              TEXT,
  page_id                 TEXT,
  extra_meta              JSONB DEFAULT '{}',
  status                  TEXT NOT NULL DEFAULT 'connected',
  connected_at            TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_social_tokens_user_id ON public.social_account_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_social_tokens_user_provider ON public.social_account_tokens(user_id, provider);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_social_tokens_updated ON public.social_account_tokens;
CREATE TRIGGER on_social_tokens_updated
  BEFORE UPDATE ON public.social_account_tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_tokens_select_own" ON public.social_account_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "social_tokens_insert_own" ON public.social_account_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_tokens_update_own" ON public.social_account_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "social_tokens_delete_own" ON public.social_account_tokens FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "service_role_bypass" ON public.social_account_tokens USING (auth.role() = 'service_role');

CREATE OR REPLACE VIEW public.social_accounts_safe AS
  SELECT id, user_id, provider, account_handle, account_label, followers_count,
         avatar_url, page_id, scopes, status, connected_at, last_synced_at, expires_at, extra_meta
  FROM public.social_account_tokens;

GRANT SELECT ON public.social_accounts_safe TO authenticated;
GRANT ALL ON public.social_account_tokens TO service_role;
