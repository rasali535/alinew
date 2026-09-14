# Post-Deployment Operations & Maintenance

This guide covers day-to-day operations, monitoring, troubleshooting, and maintenance for the Rasali Labs production environment.

---

## 1. Production Architecture Overview

- **Web Application & UI**: Hosted on **Hostinger** via **Managed Node.js hosting** (configured and operated through Hostinger hPanel).
  - *Note*: Hostinger is **not a VPS**. Operations do not involve SSH, Docker Compose, or manual Nginx management.
- **Backend Services**: Hosted on **Render** (`alinew-chatbot-backend`, `ralion-dynamic-backend`).
- **Database & Identity**: **Supabase** (Postgres, Auth, Storage).

---

## 2. Daily Monitoring & Operational Checks

### Hostinger Managed Node.js Checks (hPanel)
1. **Access hPanel**: Log into [Hostinger hPanel](https://hpanel.hostinger.com/).
2. **Review Application Status**: Check website dashboard for `rasalilabs.com` to ensure the Node.js process is active.
3. **Inspect Application Logs**: In hPanel under **Application Logs** or **Access Logs**, check for runtime warnings or uncaught exceptions.
4. **Deployments History**: Review the **Deployments** tab in hPanel to confirm latest builds succeeded.

### Render Backend Services Checks
1. Log into the [Render Dashboard](https://dashboard.render.com/).
2. Verify service health:
   - `alinew-chatbot-backend`: Status **Live**.
   - `ralion-dynamic-backend`: Status **Live**.
3. View real-time logs under each service tab to verify clean API dispatch and lack of connection errors.

---

## 3. Redeployment Procedures

### Hostinger Web Application Redeployment
When code is updated on `main`, or when build-time environment variables (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) are rotated:
1. Open **Hostinger hPanel** → **Deployments**.
2. Trigger **Deploy** / **Redeploy**.
3. Hostinger executes the build and restarts the managed Node.js application.

### Render Backend Redeployment
When backend code or server secrets change:
1. Open **Render Dashboard** → Select service.
2. Select **Manual Deploy** → **Deploy latest commit** (or restart existing deployment).

---

## 4. Troubleshooting Common Issues

### 1. Supabase Key Rotation & Client Authentication Errors
- **Symptom**: Browser clients receive 401 or invalid key errors after credential rotation.
- **Remedy**: Because `NEXT_PUBLIC_*` environment variables are embedded into JavaScript bundles at build time, updating the variable in hPanel is not enough on its own. You must trigger a **Redeploy** in Hostinger Deployments so that the Next.js bundle is recompiled with the new publishable key.

### 2. Service-Role / Secret Key Operations Failing
- **Symptom**: Server-side privileged operations (e.g. Storage signed URLs, administrative queries) fail with 403 or unauthorized.
- **Remedy**: Ensure `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) is updated in Render environment settings and the Render service is restarted.

### 3. Client Secret Leak Prevention
- Browser bundles must never contain secret keys. Run automated bundle scans locally (`npx tsx scripts/test-provider-abstraction-scan.ts` or similar) to ensure only public keys are baked into client-side code.
