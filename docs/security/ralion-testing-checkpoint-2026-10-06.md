# Ralion testing checkpoint — 6 October 2026

Production project: `yidsfihagwttlmhfynmf`. Repository base: `c7141cd` (merged PR #95).

## Changes applied to the live database

- Revoked schema CREATE from PUBLIC, anon and authenticated.
- Revoked anonymous execution of eight legacy SECURITY DEFINER functions.
- Kept authenticated execution only for `get_user_organizations`, `has_permission` and `has_product_access`. Their bodies constrain lookups to `auth.uid()`; the organization helper is used in existing RLS policies.
- Restricted organization-edition/feature RPCs and trigger/event-trigger functions to the server role. Repository searches found no application callers or policies requiring client execution of the edition/feature functions.
- Pinned ten previously mutable function search paths. Knowledge matching keeps a pinned path containing public for the existing pgvector operator; clients can no longer CREATE objects there.

The live security advisor confirms zero `anon_security_definer_function_executable` findings and zero `function_search_path_mutable` findings after applying the migration. Three authenticated helper notices remain intentionally. The vector-extension location and disabled leaked-password protection warnings remain. Twenty-nine RLS-enabled/no-policy tables remain deny-by-default to client roles; adding broad policies merely to clear these informational notices would weaken their server-only boundary.

## Validation and its limits

- `npm test`, repository static security audit and 12-stage static readiness checks passed. The readiness output now explicitly avoids claiming live production clearance.
- Migration applied successfully to live Supabase. Read-only role probes confirmed anonymous RPC denial, client schema CREATE denial, rejection of unrelated authenticated membership/subscription/entitlement access, and preserved service-role edition/feature access.
- The production `organization_members` table currently has no rows. Consequently a positive member-policy fixture was tested locally rather than being claimed as a successful live member read.
- Local PostgreSQL WASM execution (PGlite 0.3.14, temporary dependency outside the repository) passed the same regression assertions: actual anonymous RPC/DDL rejection, two-tenant RLS separation, trigger execution after EXECUTE revocation, service-role privileges, idempotent reapplication and application to an empty preview.
- Native embedded PostgreSQL cannot start in this workspace's root-only UID namespace. The committed regression runs on GitHub's non-root Ubuntu runner.
- Retried the previously cancelled Playwright job in run [37363471292](https://github.com/rasali535/alinew/actions/runs/37363471292). Job 112107213301 succeeded: 14 passed initially, one Chromium authenticated test passed on retry after `/api/auth/context` exceeded the 30-second test budget. All 15 were executed, with no skipped tests. This exercises live login, forged tenant authority, session reload/logout, anonymous API boundaries and private asset denial across Chromium, Firefox and WebKit.
- A separate local Playwright request run could not reach the website (`EAI_AGAIN`); those nine attempts are environment errors, not passing security evidence or demonstrated product vulnerabilities.

## Remaining before full sign-off

1. Supabase branch still reports `MIGRATIONS_FAILED`. The tracked Supabase migration stream lacks the original organizations/workspaces and social table baseline, while later migrations reference those tables. This is a reproducible dependency gap in the repository; the branch's original error log has not yet been retrieved. An empty-preview pass of the new hardening migration alone does not repair that older stream.
2. Resolve or explain the Chromium/API timeout through a clean follow-up run and runtime diagnostics.
3. Review leaked-password protection and pgvector extension placement separately; moving the extension requires checking operator/type dependencies and is not part of this targeted permission fix.
4. Complete deeper authenticated, two-real-customer penetration checks and live business-flow acceptance before final production clearance. The current automated checks do not prove real social publishing, provider revocation, generated creative delivery, billing mutations or hands-free voice acceptance.

Remediation references:

- [Public privileged-function execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Mutable function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
