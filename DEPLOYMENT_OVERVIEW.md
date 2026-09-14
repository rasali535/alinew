# 🎯 Rasali Labs Deployment — Architecture & Overview

This document summarizes the production deployment architecture and workflow for Rasali Labs.

---

## 🏛️ Production Architecture

Rasali Labs uses a modern, managed dual-host architecture:

| Component | Platform | Deployment Mechanism | Purpose |
|---|---|---|---|
| **Web Frontend & UI** | **Hostinger** | Managed Node.js via hPanel | Serves website, marketing pages, and Ralion Next.js web application. |
| **Dynamic API & Backend** | **Render** | Managed Web Services (`render.yaml`) | Express API, dynamic microservices, and background tasks. |
| **Database & Auth** | **Supabase** | Managed Cloud Platform | PostgreSQL, Auth, RLS policies, and private Storage. |

> [!NOTE]
> **Hostinger Architecture**: Hostinger is **managed Node.js hosting**, not a VPS. There is no SSH deployment, no Docker daemon on Hostinger, no Docker Compose deployment, and no manual Nginx proxy management. Repository integration, environment variables, and builds are managed natively inside Hostinger hPanel.

> [!NOTE]
> **Docker Usage**: `Dockerfile.ralion` and `docker-compose.yml` are maintained for Render deployments (`render.yaml`) and local development/testing only.

---

## 📚 Deployment Documentation

- **[HOSTINGER_DEPLOYMENT.md](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/HOSTINGER_DEPLOYMENT.md)**: Detailed Hostinger managed Node.js deployment guide via hPanel.
- **[DEPLOY_TO_HOSTINGER.md](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/DEPLOY_TO_HOSTINGER.md)**: Step-by-step hPanel deployment instructions.
- **[DEPLOYMENT_QUICK_START.md](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/DEPLOYMENT_QUICK_START.md)**: Quick summary checklist for deploying to Hostinger and Render.

---

## 🔄 Hostinger Deployment Workflow

1. **Connect Repo**: In Hostinger hPanel, connect the GitHub repository to the `main` branch.
2. **Configure Environment in hPanel**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_RASALI_PLATFORM_URL`
   - `NODE_ENV=production`
3. **Trigger Deploy**: Hostinger builds and serves the application via managed Node.js.
4. **Key Rotation Rebuild**: When the Supabase publishable key is rotated, trigger a Redeploy in Hostinger Deployments so the client JS bundle is rebuilt with the new key.

---

## 🔄 Render Deployment Workflow

1. Configure environment variables in the Render Dashboard (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`).
2. Trigger deployment from Render dashboard (defined via `render.yaml`).
