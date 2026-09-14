# 🚀 Deploy Rasali Labs to Hostinger Managed Node.js Hosting

## Overview & Architecture

Rasali Labs production infrastructure is structured across two dedicated hosting platforms:

1. **Hostinger**: **Managed Node.js Hosting** configured through **hPanel**.
   - Hostinger is **not a VPS**. It does not use Docker containers, SSH deployment, or manual Nginx management on the server.
   - Hostinger hosts the front-facing web application and routes through its managed runtime environment.
   - Deployments are connected directly to the GitHub repository and managed through Hostinger Deployments in hPanel.
   - Build-time environment variables (`NEXT_PUBLIC_*`, `VITE_*`) and runtime configuration are managed directly in the hPanel dashboard.

2. **Render**: Separately hosted backend services.
   - Runs backend services (such as dynamic API handling and microservices).
   - Configured and deployed separately via Render's dashboard and `render.yaml`.

> [!IMPORTANT]
> **Docker & Docker Compose**: `Dockerfile.ralion` and `docker-compose.yml` in this repository are maintained for Render deployments (`render.yaml`) and local development/testing. They are **not** used by Hostinger, which relies on native managed Node.js execution.

---

## Production Deployment Architecture

```
Internet Request → rasalilabs.com (Hostinger Managed Node.js Runtime)
                       ├── Web Frontend & UI Pages
                       └── Dynamic / API Requests → Render Services (alinew / ralion-dynamic-backend)
                                                          └── Supabase & Database
```

---

## Hostinger Managed Deployment Process

### 1. Connect GitHub Repository in hPanel
1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com/).
2. Navigate to **Websites** → Select your domain (`rasalilabs.com`).
3. Under the **Advanced** or **Git / Application** section, connect your GitHub repository (`rasalilabs/alinew` or your repo URL).
4. Set the production branch to `main`.

### 2. Configure Environment Variables in hPanel
In hPanel under **Environment Variables** / **Application Settings**, set the required public and operational keys.

#### Browser-Safe / Build-Time Configuration:
```env
NEXT_PUBLIC_SUPABASE_URL=https://yidsfihagwttlmhfynmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new_publishable_key>
NEXT_PUBLIC_APP_URL=https://rasalilabs.com/ralion
NEXT_PUBLIC_RASALI_PLATFORM_URL=https://rasalilabs.com
NODE_ENV=production
```

> [!WARNING]
> Because `NEXT_PUBLIC_*` variables are compiled and baked into client-side JavaScript bundles during the Next.js/Vite build process, **any change to the Supabase publishable key requires triggering a new build/redeployment in Hostinger Deployments** for browser clients to receive the updated key.

#### Privileged Runtime Configuration:
Any backend or server-side keys configured on Hostinger or Render must be set exclusively in the respective hosting provider's secure environment settings. **Never commit secrets to Git or hardcode them in repository files.**

### 3. Build & Deployment via Hostinger Deployments
Hostinger automatically runs the project build according to your application configuration:
1. **Install command**: `npm install --legacy-peer-deps`
2. **Build command**: `npm run ralion:build` (or configured workspace build)
3. **Start command**: Configured start script for the managed Node.js application.

To deploy changes or rebuild with updated environment variables:
- Go to **hPanel** → **Deployments**.
- Click **Deploy** or **Redeploy** to trigger a fresh build and containerless process restart.

---

## Render Deployment Process (Separate Backend Services)

Backend dynamic services hosted on Render are managed independently:
1. Open the [Render Dashboard](https://dashboard.render.com/).
2. Locate the services defined in `render.yaml`:
   - `alinew-chatbot-backend` (Node.js web service)
   - `ralion-dynamic-backend` (Docker web service using `Dockerfile.ralion`)
3. Ensure the rotated Supabase credentials are configured in the Render Environment settings:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`
4. Trigger **Manual Deploy** → **Deploy latest commit** (or allow automatic deploy on branch update).

---

## Post-Deployment Smoke Verification

After redeploying on both Hostinger and Render:

1. **Hostinger Managed Web Application**:
   - Access `https://rasalilabs.com/` and `https://rasalilabs.com/ralion`.
   - Verify pages load cleanly without console errors.
   - Verify the login and session restoration flows work.
   - Confirm browser bundles contain only the publishable key and **zero secret/service keys**.

2. **Backend & Tenant Context**:
   - Verify Mari resolves the correct tenant and organization context (`Ralion OS`).
   - Confirm private creative delivery generates valid signed URLs without leaking credentials.
   - Check that Render services report healthy status in their runtime logs.
