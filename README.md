# Ras Ali Labs & Ralion AI Business OS

> **Empowered to Prosper** — The AI-Powered Business Operating System and Sovereign Enterprise Cloud.

Welcome to the official repository for **Ras Ali Labs** and **Ralion OS**. This unified monorepo contains the public marketing portal, the complete Ralion AI Business Operating System (Web & Desktop), shared enterprise libraries, intelligent AI inference routing, and production proxy backends.

---

## 📂 Repository Architecture

This project is structured as a high-performance npm monorepo with modular applications and shared packages:

```
alinew/
├── apps/
│   ├── website/        # Public marketing portal & onboarding flow (React + Vite)
│   ├── ralion/         # Ralion Business OS Web Dashboard & Modules (Next.js 14)
│   ├── admin/          # Platform administration & enterprise telemetry (Next.js)
│   └── desktop/        # Cross-platform Desktop App (Electron)
├── packages/
│   ├── ui/             # Design system, Sidebar, Header, and shared UI components
│   ├── core/           # Business domain models, utility helpers, and shared state
│   ├── auth/           # RBAC permissions, license tier definitions, and Supabase auth
│   ├── database/       # Supabase client, migrations, and PostgreSQL schemas
│   ├── ai/             # Mari AI contextual assistant, Gemini 2.5 Flash, RAG & Token Telemetry
│   ├── integrations/   # Social & Cloud integrations (Meta Graph API, Zernio, etc.)
│   └── modules/        # Enterprise modules (Billing, CRM, Documents, Workflows)
├── scripts/            # End-to-end regression test suites and performance benchmarks
└── server/             # Standalone API server & background services (Node.js/Express)
```

---

## ⚡ Core Capabilities & Production Systems

### 1. Mari AI — AI Business Growth Partner
- **Multi-Tier Model Routing**: Primary execution on Google's official **Gemini 2.5 Flash** (`gemini-2.5-flash`) with automatic task-based routing for media generation (**FLUX.1-schnell** images and **CogVideoX** video reels) and an offline strategic rule engine fallback.
- **Layered Business Knowledge Injection**: Automatically grounds responses in Layer 1 (company name, industry, value propositions, target markets) and Layer 2 (live CRM pipeline and social reach velocity) business intelligence.
- **Durable Token Telemetry & Tenant Isolation**: Real-time token usage metering persisted directly to Supabase `security_audit_logs` with strict multi-tenant boundary checks.

### 2. High-Performance Growth Center
- **Zero-Blocking Architecture**: Ultra-fast shell render (~12ms) with asynchronous non-blocking data hydration (`Promise.allSettled`).
- **Tab-Level Lazy Loading**: Defers heavy tab hydration (Inbox, Comments, Mari Growth, Market Research) until the user activates the respective tab.
- **Tenant-Scoped Caching & Deduplication**: Safe 60-second in-memory caching and in-flight promise deduplication to eliminate redundant network traffic.

### 3. Social Integration Hub & Outbound Messaging
- **Active Channel**: **Facebook Pages** (Meta Graph API / Zernio) with automated discovery of managed pages (`/me/accounts`), post ingestion, and live thread messaging.
- **Roadmap Channels**: Clear *Coming Soon* distinction for Instagram, LinkedIn, TikTok, X, and WhatsApp with disabled connection controls.
- **Social Inbox**: Tenant-resolved outbound replies dispatched to live thread endpoints with durable message auditing.

### 4. Multi-Tenant Platform Admin Command Centre
- **Dedicated Hybrid Routing**: PHP cURL proxy (`api_proxy.php`) on Hostinger forwarding dynamic `/api/*` and `/ralion/api/*` routes to the Render backend (`ralion-dynamic-backend.onrender.com`).
- **Strict JSON Contract**: Enforces JSON response types (`application/json`) across all HTTP statuses (`200`, `401`, `403`, `500`), preventing HTML rewrite parsing errors.
- **Zero Cross-Tenant Leakage**: All analytics, CRM statistics, and audit logs are cryptographically scoped by tenant and workspace IDs.

### 5. Ralion Retail Cashier Workstation (Issue #153)
- **Dedicated POS Terminal**: Independent full-screen touch workstation (`/ralion/cashier` and `/cashier`) operating decoupled from the Ralion OS management dashboard.
- **Fast Barcode & Touch Scanning**: Focus-first hardware barcode scanning with instant SKU/name lookup, touch category chips, and visual stock badges.
- **Tender & Change Calculation**: Cash, external EFTPOS card, and bank transfer tender shortcuts with live change-due computation.
- **Thermal 80mm Receipt Printing**: Physical receipt printing modal (`window.print()`) with clean POS receipt layouts.
- **Server-Enforced Manager Approvals & Same-Transaction Nonce Claim**:
  - Independent `POS_MANAGER_APPROVAL_SIGNING_SECRET` (minimum 32 characters; fails closed if missing or insecure).
  - Cryptographic HMAC-SHA256 signed approval tokens with 5-minute TTL, strictly bound to tenant organization, workspace, cashier actor ID, mandatory terminal ID, and mandatory cart composition SHA-256 hash.
  - **Single PostgreSQL Transaction Atomicity**: The approval token nonce is claimed, verified, and recorded in `retail_pos_consumed_tokens` inside the **SAME** ACID transaction (`execute_atomic_retail_sale`) as the sale, stock deduction, and payments. If two concurrent requests attempt to redeem the same approval token, PostgreSQL unique constraint violation (`23505`) rolls back the entire transaction atomically—guaranteeing that no duplicate discounted sale or double inventory deduction can ever occur.
  - **Idempotency Preservation**: Safe retries of identical checkouts using the same `idempotencyKey` return the existing sale without re-executing token consumption or failing with replay errors.
  - **Atomic Multi-Instance Rate Limiting**: Anti-brute-force lockout is managed via atomic PostgreSQL RPC `record_pos_failed_attempt` (`ON CONFLICT DO UPDATE` row-level lock) in table `retail_pos_lockouts`. Lockout status and failure recording **fail closed** if the database is unreachable, eliminating bypasses from process resets or in-memory undercounts.
  - Salted KDF PIN verification using PBKDF2 (SHA-512, 100,000 iterations, 16-byte random salt, `<salt>:<hash>` format) with constant-time verification (`crypto.timingSafeEqual`). Plaintext PINs are strictly rejected.
  - Multi-tenant role verification against authoritative `workspace_members` schema for `OWNER` or `ADMINISTRATOR` roles.
  - Mandatory durable security audit logging persisted to `security_audit_logs` (fails closed if audit persistence fails).
  - Store policy discount ceiling (50% max) strictly enforced on the server for all callers, including direct store owners and administrators.
- **Authoritative Server Pricing & Database-Persisted Tender Settlement**:
  - Authoritative currency derived from workspace Retail settings/entitlements.
  - Server recalculates line subtotals, taxes, and grand totals directly from database product records, ignoring client-supplied unit prices or unit costs.
  - Strict tender validation rejecting invalid, NaN, negative, or zero payment entries.
  - Client payment totals are untrusted; checkout strictly verifies that total tendered covers the authoritative grand total (`INSUFFICIENT_PAYMENT` guard).
  - **Database-Persisted Verifiable Settlement State**: External tenders (`CARD_EXTERNAL` or `BANK_TRANSFER`) lack automated settlement proof at the POS register and are recorded directly into `retail_sales(payment_status)` as `'PARTIAL'` with payment references tagged `[UNVERIFIED_EXTERNAL_SETTLEMENT: Pending Reconciliation]`. Pure cash tenders are recorded as `'PAID'`. The settlement status is enforced and persisted in the database transaction, not merely patched in the JSON response.
- **Database Migrations & Dedicated Rollback Script Storage**:
  - **Canonical Forward Migration**: `supabase/migrations/20261025000000_retail_pos_security_hardening.sql` (and mirrored in `packages/database/migrations/`) creates `retail_pos_consumed_tokens`, `retail_pos_lockouts`, `record_pos_failed_attempt`, and replaces `execute_atomic_retail_sale` with single-transaction approval nonce claim.
  - **Privileged `SECURITY DEFINER` RPC Lockdown**: `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated` on all privileged POS RPCs (`execute_atomic_retail_sale`, `record_pos_failed_attempt`, `reset_pos_lockout`, `execute_atomic_goods_receipt`, `execute_atomic_quotation_conversion`, `execute_atomic_sale_refund`). Only `service_role` is granted `EXECUTE`. Direct Supabase client RPC calls from browser/cashier devices are rejected with PostgreSQL error `42501` (permission denied), ensuring all checkouts and approvals must pass through the trusted Next.js server route.
  - **Safe Rollback Script Location**: Stored strictly outside auto-applied migration folders in `docs/rollback/20261025000000_retail_pos_security_hardening_rollback.sql`. Supabase migration runners (`supabase db push`) only track canonical forward migrations, preventing accidental rollback execution or version collision. In the event of emergency rollback, the script can be manually applied via `psql -f docs/rollback/20261025000000_retail_pos_security_hardening_rollback.sql`.
  - **CI Migration Replay**: The Retail POS security migration raises the expected public-table count from 125 to 127. `scripts/security/test-preview-migration-replay.mjs` also asserts the presence of `retail_pos_consumed_tokens` and `retail_pos_lockouts` so future schema omissions are caught.
- **Cashier-Specific Mari Assistant**: Non-blocking drawer assistant providing real-time stock checks, approved selling price inquiries (strictly masking confidential purchase costs), and deterministic walk-in quotation generation with 1-click cart loading and atomic quotation-to-sale conversion.
- **Server-Side Administrative Lockdown**: Management APIs (`expenses`, `payroll/runs`, `reports`, `demo-data`, `purchasing/orders`) independently deny access with HTTP 403 for `CASHIER` accounts, backed by client-level dashboard redirects.

### 6. MARI Smart Stock Receiving & Purchasing (Issue #161)
- **Multi-Format Ingestion**: Ingests supplier invoices, packing lists, and delivery notes across PDF, scanned PNG/JPG, XLSX, and CSV documents with strict file signature magic-byte verification (rejecting executable or corrupt uploads) and SHA-256 duplicate detection.
- **Human-in-the-Loop Draft-First Architecture**: Uploading a supplier document **NEVER** automatically increases stock or modifies inventory ledger balances. Uploads produce an immutable, reviewable draft (`PENDING_EXTRACTION` -> `READY_FOR_REVIEW`) awaiting authorized manager approval.
- **Strict Role-Based Manager Approval**:
  - Only authorized managerial accounts (`canManageInventory` / `canManagePurchasing`, `STORE_OWNER`, or `RETAIL_MANAGER`) can approve and post goods receipts.
  - Cashier accounts attempting to review or post receipts receive immediate HTTP 403 Forbidden.
- **Anti-Prompt-Injection & Untrusted Data Defense**:
  - Untrusted supplier documents are treated strictly as passive, adversarial data.
  - System instructions enforce strict schema-constrained structured output, rejecting instructional override attempts or prompt injection embedded in line item descriptions.
- **Packing List Financial Defense**:
  - Delivery packing lists without unit costs strictly retain `NULL` costs unless linked to an approved Purchase Order or catalogue record.
  - The system **NEVER** fabricates, hallucinates, or estimates purchase costs or tax rates.
- **Intelligent Catalogue Matching & Packaging Conversion**:
  - Multi-tier matching engine: Barcode lookup -> Supplier SKU -> Product SKU -> Fuzzy name & brand matching.
  - Automatic packaging conversion factor resolution (`stated_quantity * pack_size`) with integer-scaled base quantity calculation and precision guard (maximum 2 decimal places).
  - Shortage and damaged item flagging with automated delta discrepancy tracking (`missing_quantity = stated_quantity - received_quantity - damaged_quantity`).
- **Atomic Single-Transaction Goods Receipt Posting**:
  - Driven by privileged PostgreSQL RPC `execute_atomic_smart_stock_receipt`.
  - Row-level lock (`FOR UPDATE`) on draft and stock balances.
  - Nonce-protected idempotency guard: repeated approvals with the same nonce return the existing receipt safely without double-receiving or stock inflation.
  - Simultaneously posts Goods Receipt, creates/updates PO lines, records durable stock movements (`RECEIVING` / `PURCHASE_ORDER`), updates physical stock (`retail_stock_levels`), and writes operational audit logs in a single ACID transaction.
  - RPC execution revoked from `PUBLIC`, `anon`, and `authenticated`; granted exclusively to `service_role`.

---

## 💎 License & Subscription Tiers

Ralion OS is powered by a tiered access model tailored for businesses of every scale, offering flexible billing intervals (**Daily**, **Weekly**, **Monthly**, and **Yearly**):

| Tier | Pricing Options | Quota & Features | Access Level |
|---|---|---|---|
| **Community** | **Free Forever** | Core CRM, Contacts, Task board, Document vault (5 GB), 1,000 Mari AI executions/mo. | Solo & Developers |
| **Standard** | **$1/day** · **$5/week** · **$19/mo** · **$190/yr** | Starter-Pro: 5 AI Social Posts/day, Facebook channel integration, 3 automated workflows, 10,000 Mari AI executions/mo. | Emerging Small Businesses |
| **Professional** | **$3/day** · **$15/week** · **$49/mo** · **$490/yr** | Unlimited Growth AI campaigns, unlimited automated workflows, 50,000 Mari AI executions/mo, Advanced BI cohort reports & PDF exports. | Scaling Companies |
| **Enterprise** | **Custom Quote** (Billed Annually) | All Industry Plugins (Health, Funeral, Logistics, Trade), Multi-Branch tenant isolation, SADC corridors, Sovereign Cloud, 99.99% SLA. | Multi-Branch Corporations |

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Supabase Account / Project**

### 2. Installation
Bootstrap and link all monorepo workspaces:
```bash
npm install
```

### 3. Environment Setup
Configure your environment variables in `.env` (or copy from `.env.production.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_RASALI_PLATFORM_URL=https://rasalilabs.com
```

### 4. Running Development Servers
Run the full ecosystem concurrently:
```bash
npm run dev
```

Or run specific workspaces independently:
- `npm run web:dev` — Launch Ras Ali Labs marketing website (`http://localhost:5173`)
- `npm run ralion:dev` — Launch Ralion OS Web Dashboard (`http://localhost:3000`)
- `npm run desktop:dev` — Launch Electron Desktop application

---

## 🧪 Testing & Validation Suites

The repository contains focused regression suites and performance benchmarks:

```bash
# 1. Master Production Hardening Suite (Mari AI, Telemetry, Social Inbox)
npx tsx scripts/test-master-production-hardening.ts

# 2. Mari AI 4B End-to-End Conversation Pipeline Suite
npx tsx scripts/test-mari-ai-end-to-end-pipeline.ts

# 3. Growth Center Performance Waterfall Benchmark
npx tsx scripts/benchmark-growth-center-performance.ts

# 4. Command Center & Website Multi-Tenant Isolation Suite
npx tsx scripts/test-command-center-and-website-isolation.ts

# 5. Ralion Retail: MARI Smart Stock Receiving & Purchasing Acceptance Suite
node scripts/test-retail-smart-receiving.js

# 6. Ralion Retail: Catalogue Merchandising, Search & Packaging Suite
node scripts/test-retail-catalogue-packaging.js

# 7. Database Migration Replay & Security Isolation Suite (137 tables)
node scripts/security/test-preview-migration-replay.mjs

# 8. Full TypeScript Typecheck
npm run typecheck --workspace=@ralion/app
```

---

## 📦 Production Builds & Deployment

### Unified Static Web Build
```bash
npm run build
```
The build pipeline:
1. Compiles the public marketing website into `apps/website/dist`.
2. Statically exports the Ralion Next.js application into `apps/ralion/out`.
3. Merges the Ralion OS export into `apps/website/dist/ralion` via `merge-builds.js`.
4. Outputs the unified static web deployment to `apps/website/dist` ready for Hostinger / Apache hosting with `api_proxy.php`.

### Desktop Application Builds (Windows)
```bash
npm run desktop:dist:win
```

---

## 🛡️ Security & Compliance
- **Authentication**: JWT session tokens with email verification, Google OAuth, and Meta OAuth.
- **Database Policies**: Supabase PostgreSQL Row-Level Security (RLS) guaranteeing strict tenant isolation.
- **Data Protection**: End-to-end encrypted storage vaults and compliant African regional trade corridors.
- **Audit Logs**: Immutable audit log recording for AI interactions, security events, and administrative access.

---

## 📄 License
Proprietary — © Ras Ali Labs (Pty) Ltd. All Rights Reserved.

### Retail cashier shift identifiers

Cashier shifts use PostgreSQL-generated UUID primary keys (`retail_cashier_shifts.id`). The shift-start endpoint must not construct string IDs such as `shift_<timestamp>`; the database allocates the UUID and the returned shift ID is reused for checkout and shift close. If a deployment reports `invalid input syntax for type uuid` when opening a shift, verify that the shift route and Retail database service include this fix, then redeploy and retry opening the shift (no backfill or schema migration required).
