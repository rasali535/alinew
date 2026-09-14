# 🚀 Rasali Labs Deployment — Quick Start

## Overview

Rasali Labs operates on a decoupled multi-service production architecture:
1. **Hostinger**: Managed Node.js hosting for the web application (configured via hPanel). Hostinger is **not a VPS** and does not run Docker containers or SSH pipelines.
2. **Render**: Dedicated backend services (`alinew-chatbot-backend`, `ralion-dynamic-backend`).
3. **Supabase**: Managed Postgres database, Authentication, and Storage.

---

## 1. Hostinger Managed Deployment (via hPanel)

1. **Connect GitHub Repository**:
   - In [hPanel](https://hpanel.hostinger.com/), go to **Websites** → `rasalilabs.com` → **Git / Application**.
   - Connect the repository and set the deployment branch to `main`.

2. **Configure Environment Variables in hPanel**:
   Under application settings, configure the build-time and browser-safe variables:
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_SUPABASE_URL=https://yidsfihagwttlmhfynmf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<new_publishable_key>
   NEXT_PUBLIC_APP_URL=https://rasalilabs.com/ralion
   NEXT_PUBLIC_RASALI_PLATFORM_URL=https://rasalilabs.com
   ```

3. **Deploy / Redeploy**:
   - Go to **Deployments** in hPanel.
   - Click **Deploy** / **Redeploy** to execute the managed build (`npm run ralion:build`) and start the application.
   - *Note*: Any change to the Supabase publishable key requires redeploying so the new key is baked into the browser bundle.

---

## 2. Render Services Deployment

Backend services run on Render as defined in `render.yaml`:
1. Log into the [Render Dashboard](https://dashboard.render.com/).
2. Verify environment secrets for:
   - `alinew-chatbot-backend`
   - `ralion-dynamic-backend`
3. Trigger deployment in the Render UI.

---

## 3. Post-Deployment Verification

1. Navigate to `https://rasalilabs.com` and `https://rasalilabs.com/ralion`.
2. Verify session authentication, workspace resolution, and private creative delivery.
3. Confirm browser bundles contain only publishable keys and zero secret/service keys.
