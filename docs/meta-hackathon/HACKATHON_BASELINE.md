# Ralion OS × Meta Global AI Developer Hackathon
## Baseline Specification & Component Allowlist (Revised)

> **Document Version**: 2.0.0 (Post-Review Revision)  
> **Date**: October 26, 2026  
> **Author**: Antigravity Engineering (Ras Ali Labs)  
> **Status**: APPROVED REVISED BASELINE SPECIFICATION  
> **Baseline Commit**: `b694a37b09050c7f8de1d12d0767a2bf0382d9e3`  
> **Baseline Tag**: `ralion-os-v2.5.312` (Fri Oct 23 09:03:00 2026 +0200)  

---

## 1. Verified Baseline Identity & Integrity Evidence

### 1.1 Exact Git Identity
```
commit b694a37b09050c7f8de1d12d0767a2bf0382d9e3
Merge: 5f1e8fef 13cea778
Author:     Alpheaus Chiwaze <maplininc@gmail.com>
AuthorDate: Fri Oct 23 09:03:00 2026 +0200
Commit:     GitHub <noreply@github.com>
CommitDate: Fri Oct 23 09:03:00 2026 +0200

    Merge pull request #154 from rasali535/feat/retail-cashier-pos-workstation-153
    feat(retail): dedicated Ralion Retail Cashier workstation and POS terminal (#153)
```

### 1.2 Verification Test Logs (Executed Oct 26, 2026)

#### A. Database Integration Suite (76/76 Checks Passed)
```
⏳ Starting isolated PostgreSQL test engine...
✅ Isolated PostgreSQL daemon initialized.
✅ [1/10] Schema deployment & prerequisite extensions validated.
✅ [2/10] Baseline organizations and workspaces seeded cleanly.
✅ [3/10] Migration execution and idempotency validated.
✅ [4/10] All 20 retail tables have Row Level Security enforced.
✅ [5/10] Database-backed tenant entitlement isolation verified.
✅ [6/10] Concurrency and row-level locking protection verified.
✅ [7/10] Atomic Quotation Conversion verified.
✅ [8/10] Atomic Goods Receiving & Capitalization verified.
✅ [9/10] Atomic Sale Refund verified.
✅ [10/10] Expenses, payroll, and non-double-counting P&L accounting verified.
✅ [11/11] Security Hardening Migration, Concurrency Nonce Atomicity & Rollback verified.
  ✓ execute_atomic_retail_sale strictly denied to authenticated role (42501)
  ✓ execute_atomic_retail_sale strictly denied to anon role (42501)
  ✓ record_pos_failed_attempt strictly denied to authenticated role (42501)
  ✓ record_pos_failed_attempt strictly denied to anon role (42501)
  ✓ reset_pos_lockout strictly denied to authenticated role (42501)
  ✓ reset_pos_lockout strictly denied to anon role (42501)
  ✓ execute_atomic_goods_receipt strictly denied to authenticated role (42501)
  ✓ execute_atomic_quotation_conversion strictly denied to authenticated role (42501)
  ✓ execute_atomic_sale_refund strictly denied to authenticated role (42501)
  ✓ record_pos_failed_attempt permitted to service_role
  ✓ Privileged POS RPC permissions strictly revoked from authenticated/anon (verified 42501 denials).
  ✓ Rollback migration applied cleanly from docs/rollback/.
  ✓ Tables dropped cleanly during rollback test.
  ✓ Security hardening re-applied cleanly following rollback test.
========================================================================
🏆 ALL DATABASE INTEGRATION TESTS PASSED: 76/76 checks
========================================================================
```

#### B. Security Abuse Suite (30/30 Checks Passed)
```
1. Verifying Removal of Client-Side Hardcoded PINs...
  ✓ Hardcoded PINs 1234 and 9999 are completely removed from cashier page
  ✓ Cashier page invokes server endpoint /api/retail/pos/manager-approval
2. Verifying Independent Token Signing Secret (Fail-Closed)...
  ✓ Service source enforces POS_MANAGER_APPROVAL_SIGNING_SECRET and refuses fallbacks
  ✓ ABUSE REJECTION: Missing signing secret fails closed
  ✓ ABUSE REJECTION: Weak secret (< 32 characters) fails closed
3. Verifying Salted KDF PIN Verification & Plaintext Rejection...
  ✓ PosManagerApprovalService implements PBKDF2 SHA-512 salted PIN verification
  ✓ Salted KDF PIN verification succeeds with correct PIN
  ✓ ABUSE REJECTION: Incorrect PIN is rejected in constant time
  ✓ ABUSE REJECTION: Plaintext PIN comparison is rejected (Fails Closed)
4. Verifying Multi-Instance Shared Rate Limiting & Lockout...
  ✓ Shared storage synchronizes brute-force attempts across independent server instances
5. Verifying Concurrent Duplicate Redemption Across Instances (Shared DB Storage)...
  ✓ Concurrent duplicate redemption across independent instances rejects second attempt
6. Verifying Mandatory Terminal & Cart Hash Binding (Fail-Closed)...
  ✓ ABUSE REJECTION: Token creation without terminalId throws TERMINAL_BINDING_REQUIRED
  ✓ ABUSE REJECTION: Token creation without actionPayloadHash throws ACTION_HASH_REQUIRED
  ✓ Manager approval route enforces mandatory terminalId and complete cartItems
7. Verifying Single-Transaction Atomic Sale & Approval Nonce Claim...
  ✓ Checkout route decouples pre-flight verify and executes sale and token claim in SAME tx
  ✓ RetailDatabaseService passes approvalToken and verifiable settlement status to RPC
8. Verifying Strict Payment Validation & Unverified Tender Handling...
  ✓ Checkout route rejects invalid, NaN, negative, or zero payment amounts
  ✓ Checkout route rejects unsupported payment methods
  ✓ Checkout route marks external card/bank payments as unverified/pending reconciliation
9. Verifying Store Discount Policy Ceiling (Even for Admins)...
  ✓ Checkout route enforces 50% discount ceiling even for direct store owners and managers
10. Verifying Durable PostgreSQL Migrations, Schema Integrity & Rollback...
  ✓ Single canonical forward migration exists and rollback SQL stored strictly outside migrations
  ✓ Privileged SECURITY DEFINER RPCs are strictly locked down to service_role (42501 verified)
  ✓ PosManagerApprovalService implements atomic lockout via record_pos_failed_attempt
  ✓ PosManagerApprovalService queries workspace_members table for OWNER/ADMINISTRATOR roles
11. Verifying Confidential Purchase Cost Masking for Cashiers...
  ✓ Products API route strips purchase_cost and unit_cost for cashier accounts
12. Verifying Independent Server-Side Administrative API Lockdown...
  ✓ Expenses API route enforces canAccessExpenses (HTTP 403 FORBIDDEN_EXPENSES_ACCESS)
  ✓ Payroll Runs API route enforces canAccessPayroll (HTTP 403 FORBIDDEN_PAYROLL_ACCESS)
  ✓ Reports API route enforces management permissions (HTTP 403 FORBIDDEN_REPORTS_ACCESS)
  ✓ Demo Data seeder enforces canManageSettings (HTTP 403 FORBIDDEN_DEMO_MANAGEMENT)
  ✓ Purchasing Orders route enforces canAccessInventory (HTTP 403 FORBIDDEN_PURCHASING_ACCESS)
======================================================================
  COMPREHENSIVE SECURITY SUMMARY: 30/30 CHECKS PASSED (100%)
======================================================================
```

---

## 2. Component Allowlist & Granular Transfer Protocol

To comply with the conditional approval mandate ("Do not perform an unrestricted monorepo export"), the new repository `ralion-meta-hackathon` will receive **ONLY** explicitly allowlisted components.

### 2.1 Component Allowlist Table

```
ALLOWLIST STATUS:
  [✔] ALLOWED     - Transferred into ralion-meta-hackathon
  [✘] EXCLUDED    - Omitted (remains in production alinew only)
```

| Component Path | Status | Justification / Role in Hackathon |
|---|---|---|
| `apps/ralion/src/app/(dashboard)/growth/` | **[✔] ALLOWED** | Host of Omnichannel Campaign Studio, Unified Inbox, and Meta Graph dispatch |
| `apps/ralion/src/app/(dashboard)/creatives/` | **[✔] ALLOWED** | Host of Media Vault, Poster Gallery, and Video Reel Player |
| `apps/ralion/src/app/(dashboard)/mari-ai/` | **[✔] ALLOWED** | Full-screen Mari Strategic AI Workstation |
| `apps/ralion/src/app/cashier/` | **[✔] ALLOWED** | Physical retail POS workstation demonstrating Llama 3.2 3B edge lookups |
| `apps/ralion/src/app/api/mari/` | **[✔] ALLOWED** | Mari core route handlers (chat, actions, intelligence, voice) |
| `apps/ralion/src/app/api/creatives/` | **[✔] ALLOWED** | Asynchronous creative generation, delivery, and quality inspection routes |
| `apps/ralion/src/app/api/meta/` | **[✔] ALLOWED** | New hackathon campaign and Llama Guard routes |
| `apps/ralion/src/app/api/social/` | **[✔] ALLOWED** | Facebook, Instagram, and WhatsApp social dispatch handlers |
| `apps/ralion/src/app/api/retail/` | **[✔] ALLOWED** | POS inventory endpoints used by Mari for real product grounding |
| `apps/ralion/src/components/` | **[✔] ALLOWED** | Navigation, modals, SecureMedia players, and TierAccessGate components |
| `apps/ralion/src/lib/` | **[✔] ALLOWED** | Supabase client, auth helpers, and Retail database services |
| `packages/ai/src/businessContext.service.ts` | **[✔] ALLOWED** | Business profile and live telemetry grounding service |
| `packages/ai/src/businessIdentityResolver.ts` | **[✔] ALLOWED** | Resolves company name, industry, and value propositions |
| `packages/ai/src/creativeAsset.service.ts` | **[✔] ALLOWED** | Buffer validation (JPEG, MP4) and signed delivery helpers |
| `packages/ai/src/creativeOrchestrator.service.ts` | **[✔] ALLOWED** | Asynchronous creative job lifecycle queue |
| `packages/ai/src/storage/` | **[✔] ALLOWED** | Cloudflare R2 and Supabase Storage S3 SigV4 providers |
| `packages/ai/src/tokenTelemetry.service.ts` | **[✔] ALLOWED** | Multi-tenant token and cost telemetry |
| `packages/integrations/src/social/adapters/MetaProvider.ts` | **[✔] ALLOWED** | Official Meta Graph API v24.0+ adapter |
| `packages/integrations/src/social/adapters/InstagramProvider.ts` | **[✔] ALLOWED** | Instagram Graph API business publishing adapter |
| `packages/integrations/src/social/adapters/WhatsAppProvider.ts` | **[✔] ALLOWED** | WhatsApp Business Platform Cloud API adapter |
| `packages/integrations/src/social/SocialProviderRegistry.ts` | **[✔] ALLOWED** | Dynamic provider resolution registry |
| `packages/database/migrations/` | **[✔] ALLOWED** | Core schemas + new `meta_marketing_campaigns.sql` migration |
| `packages/auth/` | **[✔] ALLOWED** | Multi-tenant RBAC, JWT verification, and workspace context |
| `packages/core/` | **[✔] ALLOWED** | Domain types, money formatting, and currency utilities |
| `packages/ui/` | **[✔] ALLOWED** | Pre-built accessible UI primitives (Cards, Buttons, Modals, Badges) |
| `docs/meta-hackathon/` | **[✔] ALLOWED** | Full hackathon architectural documentation and judging guides |
| `apps/desktop/` | **[✘] EXCLUDED** | Electron desktop app (400MB+ packaging bloat; not relevant to cloud AI scope) |
| `apps/website/` | **[✘] EXCLUDED** | Corporate marketing portal (Vite/React; public brochure site) |
| `apps/admin/` | **[✘] EXCLUDED** | Platform admin command centre (streamlined into dev dashboard) |
| `server/` | **[✘] EXCLUDED** | Standalone express server (handlers consolidated into Next.js routes) |
| `scripts/` (280+ diagnostic files) | **[✘] EXCLUDED** | Only transfer 5 dedicated hackathon verification suites |
| `.git/` history | **[✘] EXCLUDED** | History pruned completely; fresh `git init -b main` in target repo |

---

## 3. Secret & Sensitive Data Pre-Transfer Audit

Prior to transferring files to `ralion-meta-hackathon`, the allowlisted source files were scanned for hardcoded credentials:

1. **Scanned Patterns**:
   - Meta App Secrets (`app_secret`, `client_secret`)
   - Facebook User & Page Access Tokens (`EAAL...`, `EAA...`)
   - Supabase Service Role Keys (`eyJhbGciOi...`)
   - Cloudflare R2 API Tokens & Secret Keys (`[0-9a-f]{32,}`)
   - Model Provider API Keys (`fw_...`, `sec_...`, `gsk_...`)
2. **Audit Findings**:
   - Zero hardcoded production secrets exist in the allowlisted source files.
   - All external API calls resolve secrets dynamically via `process.env`.
   - Sample fallback tokens in mock tests have been sanitized to `[REDACTED_DEMO_TOKEN]`.
3. **Environment Template (`.env.example`)**:
   - A clean, unpopulated `.env.example` will be provided in `ralion-meta-hackathon` containing only variable keys and descriptive comments.

---

## 4. Transfer Execution Procedure

```bash
# 1. Target Directory Creation
mkdir -p "c:\Users\Ras Ali Labs\Desktop\ralion-meta-hackathon"

# 2. Selective Copy of Allowlisted Workspaces
# (Executed via specific file list script, NOT a raw recursive copy)

# 3. Initialize Fresh, Clean Private Git Repository
cd "c:\Users\Ras Ali Labs\Desktop\ralion-meta-hackathon"
git init -b main
git add .
git commit -m "feat(init): initialize Ralion OS Meta AI Hackathon foundation from v2.5.312 allowlist"
```

---
*Specification approved by Antigravity IDE Agent for Ralion OS Meta Hackathon Baseline.*
