-- Ralion OS: durable, tenant-scoped Mari token usage accounting.
-- Reuses the canonical public.audit_logs table; no client role receives access.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;

-- A request can be retried by the browser or another backend instance. Keep
-- provider usage exactly once per tenant while leaving other audit events alone.
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_mari_request_id
    ON public.audit_logs (organization_id, (metadata ->> 'requestId'))
    WHERE module = 'MARI_AI'
      AND action = 'MARI_AI_QUERY'
      AND metadata ? 'requestId';

CREATE INDEX IF NOT EXISTS idx_audit_logs_mari_usage_created
    ON public.audit_logs (organization_id, created_at DESC)
    WHERE module = 'MARI_AI'
      AND action = 'MARI_AI_QUERY';

COMMENT ON INDEX public.idx_audit_logs_mari_request_id IS
    'Exactly-once Mari provider usage event per organization and request ID.';
