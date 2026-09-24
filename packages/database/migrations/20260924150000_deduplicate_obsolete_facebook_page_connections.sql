-- Ralion OS — Deduplicate Obsolete Facebook Page Connections
--
-- Requirements:
-- 1. Canonical Page resolution: When checking Facebook Page access, prefer the newest
--    tenant/workspace Page connection with connection_status = 'CONNECTED' and token_status = 'TOKEN_VALID'.
-- 2. Deduplicate old Page bindings: Archive / delete obsolete historical Facebook Page records
--    for a tenant where a newer valid binding for the same Page/provider exists.
--    Do not leave historical failed attempts inflating Admin health.
-- 3. Preserve social_posts provenance by re-linking any posts attached to the obsolete connection
--    to the active canonical connection before deletion.

DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN (
    SELECT DISTINCT ON (c_obs.id)
      c_obs.id AS obsolete_id,
      c_valid.id AS canonical_id,
      c_obs.provider_account_id
    FROM public.social_connections c_obs
    JOIN public.social_connections c_valid
      ON c_valid.provider = 'facebook'
     AND c_valid.provider_account_id = c_obs.provider_account_id
     AND (
       (c_valid.organization_id IS NOT NULL AND c_valid.organization_id = c_obs.organization_id)
       OR (c_valid.workspace_id IS NOT NULL AND c_valid.workspace_id = c_obs.workspace_id)
     )
     AND c_valid.id != c_obs.id
     AND c_valid.connection_status IN ('CONNECTED', 'ACTIVE')
     AND c_valid.token_status = 'TOKEN_VALID'
     AND c_valid.disconnected_at IS NULL
    WHERE c_obs.provider = 'facebook'
      AND (
        c_obs.token_status != 'TOKEN_VALID'
        OR c_obs.connection_status NOT IN ('CONNECTED', 'ACTIVE')
        OR c_obs.disconnected_at IS NOT NULL
        OR c_obs.updated_at < c_valid.updated_at
      )
    ORDER BY c_obs.id, c_valid.updated_at DESC
  ) LOOP
    -- Repoint publication history to the canonical connection
    UPDATE public.social_posts
    SET social_connection_id = v_rec.canonical_id
    WHERE social_connection_id = v_rec.obsolete_id;

    -- Delete obsolete connection (cascades credentials)
    DELETE FROM public.social_connections
    WHERE id = v_rec.obsolete_id;
  END LOOP;
END $$;
