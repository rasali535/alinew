# Mari Marketing Learning Engine V1

## Purpose

Turn tenant-specific marketing execution into durable, evidence-backed learning without pretending correlation is causation.

## Closed loop

1. Growth/Social content is published through the authenticated Ralion publishing route.
2. Publication provenance is registered as an observational marketing experiment.
3. Canonical `social_posts` history is reconciled with live Facebook post evidence.
4. Changed metric snapshots are stored idempotently in `mari_marketing_outcomes`.
5. Comparable outcomes are grouped by content type and evaluated conservatively.
6. Evidence-backed patterns are stored in `mari_marketing_learnings` with confidence and sample size.
7. Mari reasoning loads relevant tenant learnings and uses low-confidence evidence to propose tests rather than strong claims.

## Evidence rules

- Tenant isolation is mandatory for every read and write.
- No fabricated historical performance.
- No causal claim from observational social data.
- At least two observations per compared content type and four total matched experiments are required.
- Reach-normalized engagement rate is preferred when available.
- When only raw engagement is available, confidence is capped below `SUPPORTED` status.
- Unclear separation becomes `CONTESTED` rather than a winner claim.
- Repeated metric snapshots with unchanged values are de-duplicated by deterministic hash.
- Learning/provenance failures never turn a successful social publication into a publishing failure.
- Learnings may guide original next experiments, but never auto-publish content.

## API

- `GET /api/mari/learning` — current tenant-scoped learnings.
- `POST /api/mari/learning` with `{ "action": "REFRESH" }` — reconcile canonical publication history with live platform evidence and recalculate learnings.
- `GET /api/mari/intelligence` — continues to return BI and performs a best-effort learning refresh.

## Current V1 scope

The durable outcome reconciler currently learns from Ralion-tracked Facebook publications because that platform has verified post-level evidence available through the current Page management integration. The schema supports additional channels and outcome types later without changing Mari's evidence rules.
