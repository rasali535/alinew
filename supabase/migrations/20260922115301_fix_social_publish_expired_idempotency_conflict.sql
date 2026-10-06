
CREATE OR REPLACE FUNCTION public.claim_social_publish_dispatch(
  p_user_id text,
  p_organization_id text,
  p_workspace_id text,
  p_destination text,
  p_idempotency_key text,
  p_body_hash text,
  p_lease_token text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_existing RECORD;
    v_claim_id UUID;
    v_token TEXT := COALESCE(p_lease_token, pg_catalog.gen_random_uuid()::text);
    v_cutoff TIMESTAMPTZ := pg_catalog.now() - INTERVAL '24 hours';
    v_stale_cutoff TIMESTAMPTZ := pg_catalog.now() - INTERVAL '5 minutes';
BEGIN
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

        IF v_existing.status IN ('CLAIMED', 'IN_PROGRESS') THEN
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
                RETURN pg_catalog.jsonb_build_object(
                    'claim_status', 'IN_PROGRESS_CONFLICT',
                    'claim_id', v_existing.id,
                    'conflict', true,
                    'message', 'A publish dispatch with this exact payload is currently in flight.'
                );
            END IF;
        END IF;

        IF v_existing.status = 'FAILED' THEN
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
    END IF;

    -- The unique tuple can legitimately collide with a claim older than the
    -- 24-hour idempotency window. Re-read the conflicting row and recycle it
    -- instead of reporting a false concurrent-dispatch conflict.
    SELECT *
    INTO v_existing
    FROM public.social_publish_idempotency
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND workspace_id = p_workspace_id
      AND destination = p_destination
      AND idempotency_key = p_idempotency_key
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_existing.created_at <= v_cutoff THEN
        UPDATE public.social_publish_idempotency
        SET body_hash = p_body_hash,
            status = 'IN_PROGRESS',
            lease_token = v_token,
            post_id = NULL,
            external_receipt_id = NULL,
            platform_results = '{}'::jsonb,
            error_message = NULL,
            retry_count = 0,
            claimed_at = pg_catalog.now(),
            completed_at = NULL,
            failed_at = NULL,
            expires_at = pg_catalog.now() + INTERVAL '5 minutes',
            created_at = pg_catalog.now(),
            updated_at = pg_catalog.now()
        WHERE id = v_existing.id;

        RETURN pg_catalog.jsonb_build_object(
            'claim_status', 'CLAIMED_REUSED_EXPIRED',
            'claim_id', v_existing.id,
            'lease_token', v_token,
            'conflict', false,
            'message', 'Reused expired idempotency claim.'
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'claim_status', 'IN_PROGRESS_CONFLICT',
        'claim_id', CASE WHEN FOUND THEN v_existing.id ELSE NULL END,
        'conflict', true,
        'message', 'A publish dispatch with this exact payload is currently in flight.'
    );
END;
$function$;
