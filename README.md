# Ras Ali Labs & Ralion AI Business OS

> **Empowered to Prosper** — The AI-Powered Business Operating System and Sovereign Enterprise Cloud.

Welcome to the official repository for **Ras Ali Labs** and **Ralion OS**. This unified monorepo contains the marketing website, the complete Ralion AI Business Operating System (Web & Desktop), shared enterprise libraries, and backend orchestration services.

---

## 📂 Repository Architecture

This project is structured as a high-performance npm monorepo with modular applications and shared packages:

```
alinew/
├── apps/
│   ├── website/        # Public marketing portal & onboarding flow (React + Vite)
│   ├── ralion/         # Ralion Business OS Web Dashboard & Modules (Next.js)
│   ├── admin/          # Platform administration & enterprise telemetry (Next.js)
│   └── desktop/        # Cross-platform Desktop App (Electron)
├── packages/
│   ├── ui/             # Design system, Sidebar, Header, and shared UI components
│   ├── core/           # Business domain models, utility helpers, and shared state
│   ├── auth/           # RBAC permissions, license tier definitions, and Supabase auth
│   ├── database/       # Supabase client, migrations, and PostgreSQL schemas
│   ├── ai/             # Mari AI contextual assistant & RAG inference connectors
│   └── modules/        # Enterprise modules (Billing, CRM, Documents, Workflows)
└── server/             # Standalone API server & background services (Node.js/Express)
```

---

## 💎 License & Subscription Tiers

Ralion OS is powered by a tiered access model tailored for businesses of every scale, offering flexible billing intervals (**Daily**, **Weekly**, **Monthly**, and **Yearly**):

| Tier | Pricing Options | Quota & Features | Access Level |
|---|---|---|---|
| **Community** | **Free Forever** | Core CRM, Contacts, Task board, Document vault (5 GB), 1,000 Mari AI executions/mo. | Solo & Developers |
| **Standard** | **$1/day** · **$5/week** · **$19/mo** · **$190/yr** | Affordable Starter-Pro: 5 AI Social Posts/day, connect up to 2 channels (FB + LinkedIn), 3 active automated workflows, 10,000 Mari AI executions/mo. | Emerging Small Businesses |
| **Professional** | **$3/day** · **$15/week** · **$49/mo** · **$490/yr** | Unlimited Growth AI campaigns, unlimited automated workflows, 50,000 Mari AI executions/mo, Advanced BI cohort reports & PDF exports. | Scaling Companies |
| **Enterprise** | **Custom Quote** (Billed Annually) | All Industry Plugins (Health, Funeral, Logistics, Trade), Multi-Branch tenant isolation, SADC corridors, Sovereign Cloud, 99.99% SLA. | Multi-Branch Corporations |

---

## ⚡ Core Capabilities & Innovations

1. **Ralion Growth AI & Live Meta Graph API Ingestion**:
   - Multi-channel marketing automation across Facebook, Instagram, LinkedIn, TikTok, and X.
   - Automatic discovery of user-managed Facebook Pages (`/me/accounts`) and real-time feed ingestion (`/{page-id}/posts`).
2. **Visual No-Code Automated Workflows**:
   - Event-driven rule builder for lead qualification, instant notifications, and Mari AI automated task dispatch.
3. **Mari AI Contextual Business Intelligence**:
   - Real-time natural language query analysis over organizational CRM and operational data.
4. **Strict Multi-Tenant Database Architecture**:
   - Powered by Supabase PostgreSQL with cryptographically enforced Row-Level Security (RLS).
5. **Seamless Portal Navigation**:
   - Integrated **"← Back to Ras Ali Labs"** and **"Exit OS"** controls across all dashboards, sidebars, and authentication screens.

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Supabase Account / Project**

### 2. Installation
Bootstrap and link all workspaces in the monorepo:
```bash
npm install
```

### 3. Environment Setup
Configure your environment variables in `.env` (or copy from `.env.production.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
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

## 📦 Production Builds & Deployment

### Web Monorepo Build
```bash
npm run build
```
The build pipeline automatically:
1. Compiles the public marketing website into `apps/website/dist`.
2. Statically exports the Ralion Next.js application into `apps/ralion/out`.
3. Merges the Ralion OS export into `apps/website/dist/ralion` via `merge-builds.js`.
4. Outputs the unified static web deployment to `apps/website/dist` ready for Hostinger or Cloudflare Pages.

### Desktop Application Builds (Windows)
```bash
npm run desktop:dist:win
```

---

## 🛡️ Security & Compliance
- **Authentication**: JWT session tokens with email verification, Google OAuth, and Meta OAuth.
- **Database Policies**: Supabase PostgreSQL Row-Level Security (RLS) guaranteeing strict tenant isolation.
- **Data Protection**: End-to-end encrypted storage vaults and compliant African regional trade corridors.

---

## 📄 License
Proprietary — © Ras Ali Labs. All Rights Reserved.
