-- Ralion OS — Canonical provider transaction uniqueness
-- PostgreSQL UNIQUE indexes allow multiple NULL transaction IDs, so the
-- non-partial index can be used directly by Supabase/PostgREST ON CONFLICT.

begin;

drop index if exists public.payments_provider_transaction_idx;
create unique index payments_provider_transaction_idx
  on public.payments (payment_provider, transaction_id);

commit;
