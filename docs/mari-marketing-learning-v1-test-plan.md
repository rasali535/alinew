# Mari Marketing Learning V1 — Acceptance Plan

## Automated gates

The pull-request CI must pass:

1. deterministic `npm ci`
2. privileged-secret scan
3. Facebook tenant-isolation verification
4. social RLS verification
5. all-workspace build
6. existing social test suite
7. `verify-mari-marketing-learning-v1.js`

## Production-shaped acceptance after merge/migration

Use an authenticated non-admin tenant with a connected Facebook Page.

1. Publish a new Growth/Social draft through `/api/social/publish`.
2. Confirm the social post succeeds independently of the learning subsystem.
3. Confirm a tenant-scoped `mari_marketing_experiments` row exists for the canonical social post and is marked observational.
4. Confirm `variables.growthSourceId` is populated when the Growth UI `pub_post_<draft-id>` idempotency key is used.
5. After platform metrics exist, call `POST /api/mari/learning` with `{ "action": "REFRESH" }`.
6. Confirm the canonical `social_posts.platform_post_ids.facebook` is matched to platform evidence.
7. Confirm an outcome snapshot is inserted and unchanged metrics do not produce duplicates on a second refresh.
8. Confirm fewer than four matched experiments or fewer than two samples per content type produce no comparative learning.
9. Confirm raw-engagement-only evidence cannot reach `SUPPORTED` confidence.
10. Confirm reach-normalized evidence can become `SUPPORTED` only with adequate sample size and separation.
11. Ask Mari what content has worked best. Confirm she cites the tenant-specific association and uncertainty rather than claiming causation.
12. Verify a second tenant cannot read, refresh, or influence the first tenant's experiments, outcomes, or learnings.

## Fail-closed rules

- Missing live evidence produces no invented outcome.
- Missing platform post ID produces no match.
- Learning/provenance errors never alter a successful social publishing response.
- No learning triggers automatic publishing.
