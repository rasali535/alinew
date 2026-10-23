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
- **Server-Enforced Manager Approvals**:
  - Independent `POS_MANAGER_APPROVAL_SIGNING_SECRET` (minimum 32 characters; fails closed if missing or insecure).
  - Cryptographic HMAC-SHA256 signed approval tokens with 5-minute TTL, strictly bound to tenant organization, workspace, cashier actor ID, terminal ID, and cart payload hash.
  - Strict single-use nonce consumption rejecting replay attacks (`TOKEN_ALREADY_CONSUMED`).
  - Salted KDF PIN verification using PBKDF2 (SHA-512, 100,000 iterations, 16-byte random salt, `<salt>:<hash>` format) with constant-time verification (`crypto.timingSafeEqual`) and anti-brute-force lockout (15 minutes after 5 consecutive failed attempts).
  - Multi-tenant role verification against authoritative `workspace_members` schema.
  - Mandatory durable security audit logging persisted to `security_audit_logs` (fails closed if audit persistence fails).
  - Store policy discount ceiling (default 50% max) strictly enforced on the server.
- **Authoritative Server Pricing & Payment Validation**:
  - Authoritative currency derived from workspace Retail settings/entitlements.
  - Server recalculates line subtotals, taxes, and grand totals directly from database product records, ignoring client-supplied unit prices or unit costs.
  - Client payment totals are untrusted; checkout strictly verifies that total tendered covers the authoritative grand total (`INSUFFICIENT_PAYMENT` guard).
- **Cashier-Specific Mari Assistant**: Non-blocking drawer assistant providing real-time stock checks, approved selling price inquiries (strictly masking confidential purchase costs), and deterministic walk-in quotation generation with 1-click cart loading and atomic quotation-to-sale conversion.
- **Server-Side Administrative Lockdown**: Management APIs (`expenses`, `payroll/runs`, `reports`, `demo-data`, `purchasing/orders`) independently deny access with HTTP 403 for `CASHIER` accounts, backed by client-level dashboard redirects.

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

# 5. Full TypeScript Typecheck
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
