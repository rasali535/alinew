# Rasali Labs Architecture & Network Flow

## Production Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                INTERNET                                 │
│                         (HTTPS Client Requests)                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐
│       HOSTINGER MANAGED NODE.JS      │   │         RENDER CLOUD SERVICES        │
│          (via Hostinger hPanel)      │   │          (via render.yaml)           │
│                                      │   │                                      │
│  • Web Application Frontend          │   │  • alinew-chatbot-backend (Express)  │
│  • Public Pages & Marketing UI       │   │  • ralion-dynamic-backend (Next.js   │
│  • Next.js Client-Side Bundles       │   │    standalone / dynamic APIs)        │
│  • Managed Node.js runtime           │   │                                      │
└──────────────────┬───────────────────┘   └──────────────────┬───────────────────┘
                   │                                          │
                   └──────────────────┬───────────────────────┘
                                      │ Outbound HTTPS
                                      ▼
                   ┌──────────────────────────────────────────┐
                   │               SUPABASE                   │
                   │                                          │
                   │  • PostgreSQL Database with RLS          │
                   │  • Supabase Auth (Session Tokens)        │
                   │  • Private Storage (Creatives signed URL)│
                   └──────────────────────────────────────────┘
```

---

## Component Roles & Responsibilities

### 1. Hostinger Managed Node.js (via hPanel)
- **Role**: Front-facing managed web application hosting.
- **Management**: Configured, deployed, and monitored directly through Hostinger hPanel.
- **Key Characteristics**: Hostinger is **managed Node.js hosting**, not a VPS. No Docker daemon, no Docker Compose, no SSH deployment pipelines, and no manual Nginx proxy configuration.
- **Environment Variables**: Managed via hPanel application settings. When `NEXT_PUBLIC_SUPABASE_ANON_KEY` or other build-time variables are rotated, a redeployment in Hostinger Deployments recompiles the browser bundle.

### 2. Render Cloud Services
- **Role**: Hosts standalone backend APIs and dynamic microservices defined in `render.yaml`.
- **Services**:
  - `alinew-chatbot-backend`: Express Node.js application.
  - `ralion-dynamic-backend`: Next.js dynamic standalone backend (built using `Dockerfile.ralion`).
- **Environment**: Environment variables and server-side secret keys (`SUPABASE_SECRET_KEY`, `DATABASE_URL`) are managed via Render's dashboard.

### 3. Local Development & Docker Usage
- **`Dockerfile.ralion`**: Used by Render (`render.yaml`) and available for local container testing.
- **`docker-compose.yml`**: Used strictly for local multi-container development and integration tests. It is **not** the Hostinger deployment mechanism.
