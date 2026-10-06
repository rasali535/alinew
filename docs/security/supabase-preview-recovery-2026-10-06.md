# Supabase preview migration recovery

Project: `yidsfihagwttlmhfynmf`. Source snapshot: 6 October 2026, after merged PR #96.

## Failure and repair

The active repository migration directory omitted the original tenant/social schema, omitted many recorded migrations, and used different timestamps from the live migration ledger. A fresh replay reached `customer_mari_api_keys` without `public.organizations`. The stored migration history also had an empty first social-publication entry and a platform-admin grant containing production user/organization IDs. That grant cannot run against an empty preview.

- Add a schema-only prerequisite baseline before the first recorded September migration. It captures 97 public tables, constraints, non-extension functions, indexes, safe views, policies, triggers and effective client/server permissions. It includes no customer rows, user accounts, provider credentials or admin grants. Generated columns retain their generated expressions. Objects already present are preserved.
- Restore recorded SQL under its actual Supabase version. Eight alternate-timestamp source files are preserved outside the active directory in `supabase/migration-archive/`.
- Restore the empty first migration entry from the existing canonical repository source. Keep the already-recorded duplicate version so repository and remote history agree.
- Remove environment-specific admin provisioning from the historical migration. Administrative access is operational data and must be provisioned explicitly in each environment. The existing live platform-admin row remains present.
- Keep the existing, unapplied Facebook deduplication migration in the active stream. It was not applied to production as part of this history repair.

The baseline omits policies created by later recorded migrations so the original policy statements can execute once in chronological order. Existing legacy policies remain captured.

## Live changes

Only migration metadata was repaired: the already-existing schema baseline was registered as applied, the empty social-publication SQL entry was recovered, and the stored admin migration was corrected for future replay. No production tables were rebuilt and no customer or admin rows were changed. All 33 recorded migrations now match the active repository SQL after trimming surrounding whitespace. The local stream has 34 entries because the existing Facebook deduplication migration is still pending remotely.

Supabase security advisors remain unchanged from PR #96: no anonymous privileged RPCs and no mutable search paths. Three intentionally authenticated membership/permission helper notices remain, alongside vector extension placement and disabled leaked-password protection warnings.

## Verification

`scripts/security/test-preview-migration-replay.mjs` runs every active migration in PostgreSQL via PGlite, including bundled pgvector and uuid-ossp extensions. Supabase-managed auth/storage prerequisites are represented by narrow local fixtures; this test does not claim to test the external Auth or Storage services.

The test passed all 34 migrations and confirms:

- 97 public tables exist, with no copied production profile/organization/workspace/social/admin rows.
- The documents bucket remains private.
- A fresh owner signup provisions a profile, organization and workspace without becoming a platform admin.
- Anonymous privileged RPC execution is denied and signed-in clients cannot create schema objects.
- Reapplying the baseline preserves an existing tenant row.

The full Node test suite and repository security/readiness checks are also required by CI. PGlite is a pinned development-only dependency; the native PostgreSQL permission regression from PR #96 remains enabled.

## Hosted status and remaining acceptance

The exposed branch inventory contains only the default `main` environment, whose database is healthy but whose migration-workflow status still reads `MIGRATIONS_FAILED`. No development branch with a distinct project reference was exposed to safely rebase. This repair therefore does not claim that a hosted preview has rebuilt successfully, and it does not reset or recreate the healthy production environment.

After the repository fix is merged, confirm the hosted integration replay/retry result. Full production sign-off also still requires deeper authenticated business-flow acceptance. The latest PR #96 Playwright run passed all 15 live browser/security tests without retries, and Node CI passed.

[Supabase migration failure guidance](https://supabase.com/docs/guides/troubleshooting/branch-in-migrations-failed-status)
