# Ralion OS — Facebook Entitlement Enforcement & Anti-Bypass Security Guide

**Document ID:** SEC-SOC-2026-08  
**Scope:** Organization Entitlement Enforcement & Multi-Tenant Protection  

---

## 1. Threat Model & Security Principles

In multi-user SaaS environments, client-side limit checks can be circumvented via direct API invocations, multi-user session races, or logout/login hopping.

Ralion OS implements **Server-Side Authoritative Entitlements**:
1. **Tenant-Level Binding:** The `facebook_page_limit` is bound to the `organization_id`, NOT the individual user ID, browser session, or OAuth connection.
2. **Atomic Verification:** Before any Page connection is persisted, the server validates the active count against the plan limit in an atomic transaction.
3. **HTTP 403 `FEATURE_LIMIT_REACHED`:** Any unauthorized attempt returns a structured 403 error payload specifying current usage and available upgrade pathways.

---

## 2. Entitlement Tier Defaults

| Tier | Plan Name | Facebook Page Limit | Multi-Destination | AI Growth Plan |
| :--- | :--- | :--- | :--- | :--- |
| **Starter** | Community / Starter | **1 Page** | No | Basic Score & Insights |
| **Professional** | Growth Pro ($49/mo) | **3 Pages** | Yes | 7-Day Strategy Engine |
| **Enterprise** | Agency / Enterprise ($199/mo) | **10+ Pages** | Unlimited | Custom Fine-Tuning & Multi-Brand |

---

## 3. Anti-Bypass Scenarios & Defenses

### Scenario A: Direct POST to `/api/social/facebook/pages`
- **Attack:** Malicious actor invokes `POST /api/social/facebook/pages` with a secondary `pageId` bypassing the UI.
- **Defense:** `FacebookPageManagementService.connectPage()` validates the organization entitlement limit server-side and aborts with a 403 error before writing to the database.

### Scenario B: Multi-User Organization Bypass
- **Attack:** User A connects Page 1. User A logs out. User B logs into the same organization and attempts to connect Page 2.
- **Defense:** The query filters `social_destinations` by `organization_id`. Since active count equals limit (1 >= 1), User B's request is rejected.

### Scenario C: Concurrent Race Condition
- **Attack:** Script simultaneously fires 5 parallel requests to connect 5 distinct pages.
- **Defense:** Database unique index `uq_org_platform_page` combined with atomic validation function ensures serial execution and deterministic limit enforcement.
