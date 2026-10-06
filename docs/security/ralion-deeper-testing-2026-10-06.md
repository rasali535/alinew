# Ralion deeper authenticated testing — 6 October 2026

PR #97 is merged. Supabase reports `FUNCTIONS_DEPLOYED` and `ACTIVE_HEALTHY`; all 34 migrations are recorded, including the pending Facebook cleanup. The dashboard responds HTTP 200. Active platform-admin access remains present, anonymous privileged public functions remain unavailable, and authenticated clients cannot create public-schema objects.

## Confirmed findings and fixes

- The authenticated Social Hub `health_check` action resolved a supplied connection ID with service-role privileges without organization/workspace ownership checks. The service can retrieve tokens, contact providers and update connection state. The fix requires canonical organization/workspace scope before resolution, rejects missing/foreign records uniformly, scopes subsequent updates, validates route IDs, and fails closed on database errors. An executable regression runs the real route/service with two tenants and two workspaces, confirming denied requests never access tokens or mutate a connection.
- The generic Mari action executor claimed tasks, contacts, reports, email drafts and workflows succeeded while returning invented IDs or download paths without performing those operations. These actions now return an unavailable result with no fabricated output. The API and UI expose that result. Navigation remains available, with protocol-relative/backslash external routes rejected. This does not implement these business mutations.

## Added verification

- The existing full migration replay now executes actual credit procedures for two synthetic tenants. It verifies retry idempotency, exactly one charge/ledger entry, failed-provider and stale-reservation release, insufficient-credit rejection, tenant wallet isolation and denial of direct authenticated credit finalization.
- Six additional live Playwright cases across Chromium, Firefox and WebKit verify canonical tenant identities in billing, credit usage, creative listings, social connections and publication history; forged tenant hints; denied creative deletion/delivery; forbidden billing mutation; invalid publishing/media parameters; and voice telemetry input/tenant rejection. These probes do not intentionally generate paid media, make payments, publish social content, disconnect accounts or create voice telemetry.
- CI now requires authenticated E2E credentials explicitly so these tests cannot silently skip.

## Acceptance limits

Two-tenant mutation testing uses an isolated PostgreSQL database and controlled route fixtures, not two real customer sessions. Live lists can be empty, so their row assertions alone do not establish positive media delivery or real social publishing. Paid creative generation and storage delivery, verified payment capture/webhooks, real provider publishing/revocation, and hands-free voice across tab navigation still need dedicated end-to-end acceptance. This report is not full production penetration-test clearance.
