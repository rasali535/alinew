# Ralion OS — Zernio Multi-Tenancy & Isolation Model

**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Author:** Ras Ali Labs (Pty) Ltd Architecture Team  

---

## 1. Multi-Tenant Philosophy

Ralion OS serves multiple enterprise customers, organizations, and workspaces. A primary architectural rule for integrating Zernio is **strict customer isolation**:
* Organization A must never view, query, or publish to Organization B's social accounts.
* Ralion user identity and authorization remain the single source of truth.
* Zernio is mapped strictly as a tenant container without creating secondary user identities.

---

## 2. Organization $\rightarrow$ Zernio Profile Mapping

```text
┌────────────────────────────┐       ┌────────────────────────────┐
│   Ralion Organization A    │       │   Ralion Organization B    │
│  (workspace: ws_alpha_123) │       │   (workspace: ws_beta_456) │
└─────────────┬──────────────┘       └─────────────┬──────────────┘
              │                                    │
              ▼                                    ▼
┌────────────────────────────┐       ┌────────────────────────────┐
│   Zernio Profile Alpha     │       │    Zernio Profile Beta     │
│   (id: prof_alpha_999)     │       │    (id: prof_beta_888)     │
└─────────────┬──────────────┘       └─────────────┬──────────────┘
              │                                    │
       ┌──────┴──────┐                      ┌──────┴──────┐
       ▼             ▼                      ▼             ▼
  IG Account    LinkedIn Org           IG Account      X Handle
  (Alpha IG)    (Alpha Corp)           (Beta IG)      (Beta Labs)
```

### Mapping Rules:
1. **1:1 Isolation:** Each Ralion organization/workspace creates exactly one active Zernio profile via `public.social_provider_profiles`.
2. **Server-Side Resolution:** The authenticated user's organization is determined from their Supabase JWT session, never from browser request parameters.
3. **Webhook Resolution:** Inbound webhooks look up the `provider_profile_id` in `social_provider_profiles` to attach events to the correct tenant. Unrecognized profile IDs are logged without exposing tenant data.

---

## 3. Database Schema Mapping

### `public.social_provider_profiles`
```sql
CREATE TABLE public.social_provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'zernio' CHECK (provider IN ('zernio')),
    provider_profile_id TEXT NOT NULL UNIQUE,
    profile_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Row Level Security Policies

Multi-tenancy is enforced directly at the database level:

```sql
-- User and Workspace Isolation Policy:
CREATE POLICY "sp_profiles_user_own" ON public.social_provider_profiles
    FOR ALL USING (
        auth.uid() = user_id OR
        (workspace_id IS NOT NULL AND workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ))
    );
```

Automated verification tests in `scripts/test-zernio-rls.js` confirm that cross-tenant queries are blocked.
