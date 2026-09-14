# 🚀 Deploy to Hostinger Managed Node.js Hosting

This guide outlines the production deployment workflow for the Rasali Labs web application on **Hostinger Managed Node.js hosting** (via hPanel).

> [!NOTE]
> Hostinger runs a managed Node.js application environment managed through hPanel. It is **not a VPS** and does not use Docker containers, SSH scripting, or manual Nginx reverse proxy configuration.

---

## Architecture Summary

- **Frontend & Web Application**: Hosted on **Hostinger** via managed Node.js runtime.
- **Dynamic API & Background Services**: Hosted on **Render** (`alinew-chatbot-backend`, `ralion-dynamic-backend`).
- **Database & Storage**: Managed **Supabase** instance.

---

## Deployment Steps

### 1. hPanel Setup & Repository Connection
1. Log into your [Hostinger hPanel](https://hpanel.hostinger.com/).
2. Navigate to your website dashboard for `rasalilabs.com`.
3. Under the **Git** or **Applications** section, ensure your GitHub repository is connected to the `main` branch.

### 2. Environment Variables Configuration
In hPanel under the application's environment configuration:
- Set `NODE_ENV=production`
- Set `NEXT_PUBLIC_SUPABASE_URL=https://yidsfihagwttlmhfynmf.supabase.co`
- Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the replacement Supabase publishable key
- Set `NEXT_PUBLIC_APP_URL=https://rasalilabs.com/ralion`
- Set `NEXT_PUBLIC_RASALI_PLATFORM_URL=https://rasalilabs.com`

> [!IMPORTANT]
> Because `NEXT_PUBLIC_*` variables are baked into browser bundles at build time, any rotation or update to `NEXT_PUBLIC_SUPABASE_ANON_KEY` requires triggering a **Redeploy** in Hostinger Deployments to compile the new key into the bundle.

### 3. Deploy Application
1. In hPanel, go to **Deployments**.
2. Click **Deploy** / **Redeploy** to trigger the build:
   - Dependencies: `npm install --legacy-peer-deps`
   - Build: `npm run ralion:build`
3. Hostinger handles the build and serves the application through its managed runtime.

### 4. Render Redeployment
Backend services on Render (`alinew-chatbot-backend` and `ralion-dynamic-backend`) must be redeployed separately in the [Render Dashboard](https://dashboard.render.com/) with their updated environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`).

---

## Verification
- Navigate to `https://rasalilabs.com` and `https://rasalilabs.com/ralion`.
- Confirm pages load and session authentication succeeds.
- Confirm browser network requests include only publishable keys and zero secret/service keys.
