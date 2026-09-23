-- Ralion OS — workspace-isolated Meta OAuth credentials
-- A Meta identity may be connected independently inside more than one
-- workspace. The credential key must therefore include workspace_id so an
-- upsert in one tenant can never move or overwrite another tenant's row.

ALTER TABLE public.meta_connections
  DROP CONSTRAINT IF EXISTS meta_connections_user_id_provider_meta_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_connections_workspace_identity_unique
  ON public.meta_connections (workspace_id, user_id, provider, meta_user_id);
