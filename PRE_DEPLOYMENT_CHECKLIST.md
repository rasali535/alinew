# Pre-Deployment Checklist

Use this checklist to verify application readiness before deploying to production.

---

## 1. Hosting & Configuration Readiness

### Hostinger Managed Node.js (hPanel)
- [ ] **Repository Connected**: Connected to `main` branch in Hostinger hPanel.
- [ ] **Environment Variables in hPanel**:
  - `NEXT_PUBLIC_SUPABASE_URL` is set to the Supabase project URL.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set to the active publishable key.
  - `NEXT_PUBLIC_APP_URL=https://rasalilabs.com/ralion`.
  - `NEXT_PUBLIC_RASALI_PLATFORM_URL=https://rasalilabs.com`.
  - `NODE_ENV=production`.
- [ ] **Key Rotation**: If the publishable key was rotated, Hostinger application is redeployed so the new key is baked into the browser bundle.

### Render Backend Services
- [ ] **Render Dashboard**: Services `alinew-chatbot-backend` and `ralion-dynamic-backend` exist and have their environment variables configured.
- [ ] **Database & Secret Keys**: Server-only keys (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`) are set securely in Render environment variables.
- [ ] **CORS**: `CORS_ORIGINS` includes `https://rasalilabs.com`.

---

## 2. Security & Credential Hygiene

- [ ] **Zero Hardcoded Secrets**: No secret keys, service role keys, or database credentials are committed to Git.
- [ ] **Client Bundle Hygiene**: Browser bundles contain only publishable keys (`NEXT_PUBLIC_*`) and zero secret or service-role keys.
- [ ] **Modern Key Format**: Key handling logic supports modern Supabase keys and does not assume keys are JWTs or split on periods.
- [ ] **Database Policies**: RLS is enabled on all tables, and privileged functions have `search_path = ''` with execution restricted to `service_role`.

---

## 3. Post-Deployment Smoke Verification

- [ ] Web application loads cleanly at `https://rasalilabs.com/` and `https://rasalilabs.com/ralion`.
- [ ] User login and session restoration operate properly.
- [ ] Correct organization and workspace resolve in user session context.
- [ ] Mari AI assistant receives canonical tenant context.
- [ ] Private creative delivery generates secure signed URLs.
