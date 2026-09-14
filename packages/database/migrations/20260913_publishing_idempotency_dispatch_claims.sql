-- =====================================================================
-- Ralion OS — Database-Backed Atomic Publishing Idempotency & Dispatch Claims
-- Migration: 20260913_publishing_idempotency_dispatch_claims.sql
--
-- Provides deployment-independent atomic uniqueness and dispatch locking
-- across multiple Node processes, PM2 clusters, and Hostinger restarts.
-- Uniqueness tuple: user_id + organization_id + workspace_id + destination + idempotency_key
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.social_publish_idempotency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    destination TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    body_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CLAIMED' CHECK (status IN ('CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    lease_token TEXT,
    post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
    external_receipt_id TEXT,
    platform_results JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (pg_catalog.now() + INTERVAL '5 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- Canonical 5-way uniqueness constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_publish_idempotency_tuple
ON public.social_publish_idempotency (user_id, organization_id, workspace_id, destination, idempotency_key);

-- Secondary lookup index for 24-hour duplicate body hash inspection
CREATE INDEX IF NOT EXISTS idx_social_publish_idempotency_hash_lookup
ON public.social_publish_idempotency (user_id, organization_id, workspace_id, destination, body_hash, created_at);

-- Foreign key index on post_id to resolve Supabase Advisor unindexed foreign key warning
CREATE INDEX IF NOT EXISTS idx_social_publish_idempotency_post_id
ON public.social_publish_idempotency (post_id);

-- Row Level Security
ALTER TABLE public.social_publish_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_publish_idempotency FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_publish_idempotency_service_role" ON public.social_publish_idempotency;
CREATE POLICY "social_publish_idempotency_service_role"
ON public.social_publish_idempotency
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 1. Atomic Dispatch Claim RPC
CREATE OR REPLACE FUNCTION public.claim_social_publish_dispatch(
    p_user_id TEXT,
    p_organization_id TEXT,
    p_workspace_id TEXT,
    p_destination TEXT,
    p_idempotency_key TEXT,
    p_body_hash TEXT,
    p_lease_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_existing RECORD;
    v_claim_id UUID;
    v_token TEXT := COALESCE(p_lease_token, pg_catalog.gen_random_uuid()::text);
    v_cutoff TIMESTAMPTZ := pg_catalog.now() - INTERVAL '24 hours';
    v_stale_cutoff TIMESTAMPTZ := pg_catalog.now() - INTERVAL '5 minutes';
BEGIN
    -- 1. Check for existing claim matching exact 5-way boundary or body hash within 24 hours
    SELECT *
    INTO v_existing
    FROM public.social_publish_idempotency
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND destination = p_destination
      AND (idempotency_key = p_idempotency_key OR body_hash = p_body_hash)
      AND created_at > v_cutoff
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        -- Case A: Completed within 24h -> Return safe idempotent result
        IF v_existing.status = 'COMPLETED' THEN
            RETURN pg_catalog.jsonb_build_object(
                'claim_status', 'ALREADY_COMPLETED',
                'claim_id', v_existing.id,
                'post_id', v_existing.post_id,
                'external_receipt_id', v_existing.external_receipt_id,
                'platform_results', v_existing.platform_results,
                'conflict', true,
                'message', 'This exact content was already published or scheduled for this account within the last 24 hours.'
            );
        END IF;

        -- Case B: Currently in-flight / claimed
        IF v_existing.status IN ('CLAIMED', 'IN_PROGRESS') THEN
            -- Check if claim lease expired (worker crashed or died)
            IF v_existing.claimed_at < v_stale_cutoff OR v_existing.expires_at < pg_catalog.now() THEN
                UPDATE public.social_publish_idempotency
                SET status = 'IN_PROGRESS',
                    lease_token = v_token,
                    claimed_at = pg_catalog.now(),
                    expires_at = pg_catalog.now() + INTERVAL '5 minutes',
                    retry_count = v_existing.retry_count + 1,
                    updated_at = pg_catalog.now()
                WHERE id = v_existing.id;

                RETURN pg_catalog.jsonb_build_object(
                    'claim_status', 'CLAIMED_RETRY',
                    'claim_id', v_existing.id,
                    'lease_token', v_token,
                    'conflict', false,
                    'message', 'Recovered stale dispatch lease.'
                );
            ELSE
                -- Active in-progress dispatch
                RETURN pg_catalog.jsonb_build_object(
                    'claim_status', 'IN_PROGRESS_CONFLICT',
                    'claim_id', v_existing.id,
                    'conflict', true,
                    'message', 'A publish dispatch with this exact payload is currently in flight.'
                );
            END IF;
        END IF;

        -- Case C: Failed previously -> Safe Retry Policy
        IF v_existing.status = 'FAILED' THEN
            -- Backoff / throttle check: max 5 retries within 15 mins
            IF v_existing.retry_count >= 5 AND v_existing.failed_at > (pg_catalog.now() - INTERVAL '15 minutes') THEN
                RETURN pg_catalog.jsonb_build_object(
                    'claim_status', 'FAILED_THROTTLED',
                    'claim_id', v_existing.id,
                    'conflict', true,
                    'message', 'Maximum retry attempts exceeded for this payload. Please wait 15 minutes before retrying.'
                );
            ELSE
                UPDATE public.social_publish_idempotency
                SET status = 'IN_PROGRESS',
                    lease_token = v_token,
                    claimed_at = pg_catalog.now(),
                    expires_at = pg_catalog.now() + INTERVAL '5 minutes',
                    retry_count = v_existing.retry_count + 1,
                    error_message = NULL,
                    updated_at = pg_catalog.now()
                WHERE id = v_existing.id;

                RETURN pg_catalog.jsonb_build_object(
                    'claim_status', 'CLAIMED_RETRY',
                    'claim_id', v_existing.id,
                    'lease_token', v_token,
                    'conflict', false,
                    'message', 'Retrying previously failed dispatch.'
                );
            END IF;
        END IF;
    END IF;

    -- 2. Insert fresh claim atomically
    INSERT INTO public.social_publish_idempotency (
        user_id,
        organization_id,
        workspace_id,
        destination,
        idempotency_key,
        body_hash,
        status,
        lease_token,
        claimed_at,
        expires_at
    ) VALUES (
        p_user_id,
        p_organization_id,
        p_workspace_id,
        p_destination,
        p_idempotency_key,
        p_body_hash,
        'IN_PROGRESS',
        v_token,
        pg_catalog.now(),
        pg_catalog.now() + INTERVAL '5 minutes'
    )
    ON CONFLICT (user_id, organization_id, workspace_id, destination, idempotency_key)
    DO NOTHING
    RETURNING id INTO v_claim_id;

    IF v_claim_id IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'claim_status', 'CLAIMED_NEW',
            'claim_id', v_claim_id,
            'lease_token', v_token,
            'conflict', false
        );
    ELSE
        -- Concurrent race condition: another process inserted just before us
        RETURN pg_catalog.jsonb_build_object(
            'claim_status', 'IN_PROGRESS_CONFLICT',
            'conflict', true,
            'message', 'Concurrent publish dispatch detected for this account.'
        );
    END IF;
END;
$$;

-- 2. Atomic Completion RPC
CREATE OR REPLACE FUNCTION public.complete_social_publish_dispatch(
    p_claim_id UUID,
    p_organization_id TEXT,
    p_workspace_id TEXT,
    p_post_id UUID DEFAULT NULL,
    p_external_receipt_id TEXT DEFAULT NULL,
    p_platform_results JSONB DEFAULT '{}'::jsonb,
    p_lease_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_rows INT;
BEGIN
    UPDATE public.social_publish_idempotency
    SET status = 'COMPLETED',
        post_id = p_post_id,
        external_receipt_id = p_external_receipt_id,
        platform_results = p_platform_results,
        completed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_claim_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND status = 'IN_PROGRESS'
      AND (p_lease_token IS NULL OR lease_token = p_lease_token);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows = 1;
END;
$$;

-- 3. Atomic Failure RPC
CREATE OR REPLACE FUNCTION public.fail_social_publish_dispatch(
    p_claim_id UUID,
    p_organization_id TEXT,
    p_workspace_id TEXT,
    p_error_message TEXT,
    p_lease_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_rows INT;
BEGIN
    UPDATE public.social_publish_idempotency
    SET status = 'FAILED',
        error_message = p_error_message,
        failed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_claim_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND status = 'IN_PROGRESS'
      AND (p_lease_token IS NULL OR lease_token = p_lease_token);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows = 1;
END;
$$;

-- Explicit Permission Hardening: Revoke from public, anon, and authenticated roles
REVOKE ALL ON TABLE public.social_publish_idempotency FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_publish_idempotency TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_social_publish_dispatch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_social_publish_dispatch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_social_publish_dispatch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_social_publish_dispatch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fail_social_publish_dispatch(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_social_publish_dispatch(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
