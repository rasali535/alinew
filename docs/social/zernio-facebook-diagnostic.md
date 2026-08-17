# Ralion OS — Facebook Connection End-to-End Diagnostic Report

**Document Version:** 1.0.0  
**Diagnostic Date:** August 17, 2026  
**Auditor / Engineer:** Ras Ali Labs (Pty) Ltd Security & Engineering Team  
**Diagnostic Status:** Complete  
**Conclusion:** `FACEBOOK CONNECTION FAILURE — ROOT CAUSE IDENTIFIED`  

---

## 1. Current Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                    RALION SOCIAL HUB (UI)                  │
│               Click "Connect Facebook" Button              │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│              Ralion API Router / Connect Route             │
│            `/api/oauth/[provider]/connect/route.ts`        │
│          OR `/api/social/zernio/connect/route.ts`          │
└──────────────┬──────────────────────────────┬──────────────┘
               │                              │
        [Direct Native]               [Zernio Infrastructure]
               │                              │
               ▼                              ▼
┌─────────────────────────────┐┌─────────────────────────────┐
│      Native Meta OAuth      ││    Supabase Edge Bridge     │
│   Requires FACEBOOK_APP_ID  ││     (`zernio-bridge`)       │
│  (Custom Meta Developer App)││  (Bearer ZERNIO_API_KEY)    │
└─────────────────────────────┘└──────────────┬──────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────────┐
                               │     Zernio Official API     │
                               │  GET /v1/connect/facebook   │
                               └──────────────┬──────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────────┐
                               │     Facebook / Meta OAuth   │
                               │  (Zernio App 712341431446)  │
                               └──────────────┬──────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────────┐
                               │   Zernio Hosted Callback    │
                               │    Webhook / Redirect       │
                               └─────────────────────────────┘
```

---

## 2. Actual Runtime Flow Traced & Failure Points

```text
Step 1: User clicks "Connect Facebook" in Ralion Social Hub
        │
        ▼
Step 2: Browser dispatches GET `/ralion/api/oauth/facebook/connect/`
        │
        ▼ ❌ FAILURE POINT 1 (Native Route Disconnect)
        │
        │ The route `/api/oauth/[provider]/connect/route.ts` checked only for
        │ `process.env.FACEBOOK_APP_ID`. Because Zernio managed infrastructure is used
        │ instead of a custom Meta App, the endpoint returned HTTP 400:
        │ "Meta (Facebook/Instagram) is not configured. Please add FACEBOOK_APP_ID..."
        │
        ▼ ❌ FAILURE POINT 2 (Supabase Auth Identity Fallback)
        │
        │ Social Hub frontend fell back to `AuthService.linkSocialAccount('facebook')`
        │ which invoked Supabase User Identity Linking instead of Social Hub Publishing.
        │ This failed with "Provider facebook is not enabled".
        │
        ▼ ❌ FAILURE POINT 3 (Zernio Profile ID Object Model)
        │
        │ In `ZernioSocialService`, `createProfile` and `listProfiles` parsed `id` instead
        │ of MongoDB `_id` (`6a82deac1a69158ef81cb2cd`). Passing undefined or custom strings
        │ to Zernio returned HTTP 400:
        │ {"error": "Invalid profileId format", "type": "invalid_request_error", "code": "invalid_field_value"}
        │
        ▼ ❌ FAILURE POINT 4 (Database Migration Pending)
        │
        │ PostgreSQL returned: `PGRST205: Could not find table 'public.social_provider_profiles'`
        │ indicating the SQL migration `20260817_zernio_social_infrastructure.sql`
        │ has not yet been executed in Supabase SQL editor.
```

---

## 3. Browser Network Request & Server Log Inspection

| Metric | Inspected Value |
| :--- | :--- |
| **Request URL** | `/ralion/api/oauth/facebook/connect/` |
| **HTTP Method** | `GET` |
| **Status Code** | `400 Bad Request` |
| **Response Body** | `{"success": false, "error": "Meta (Facebook/Instagram) is not configured. Please add FACEBOOK_APP_ID..."}` |
| **Underlying Trigger** | Missing bridge connecting `growth/page.tsx` to `SocialProviderRouter` / `ZernioSocialService` |

---

## 4. Zernio Profile Mapping Status

* **Zernio API Profile Hierarchy:** Profiles in Zernio are identified by 24-character hexadecimal MongoDB ObjectIds.
* **Live Verified Profile ObjectId:** `6a82deac1a69158ef81cb2cd` (Default Profile) and `6a82f65b8928bb63d24435a9`.
* **Mapping Requirement:** `public.social_provider_profiles` must map `(user_id / workspace_id)` $\longrightarrow$ `provider_profile_id = '6a82deac1a69158ef81cb2cd'`.

---

## 5. Live Facebook Connection Request Verification

When tested directly with the live Supabase Edge Function bridge and valid profile ObjectId `6a82deac1a69158ef81cb2cd`:

```http
GET https://zernio.com/api/v1/connect/facebook?profileId=6a82deac1a69158ef81cb2cd&redirectUri=https%3A%2F%2Frasalilabs.com%2Fralion%2Fgrowth%3Fconnected%3Dfacebook%26provider%3Dzernio
```

**Live Response (HTTP 200 OK):**
```json
{
  "authUrl": "https://www.facebook.com/v24.0/dialog/oauth?client_id=712341431446535&redirect_uri=https%3A%2F%2Fzernio.com%2Fapi%2Fv1%2Fconnect%2Ffacebook%2Fcallback&scope=pages_manage_posts+pages_show_list+pages_read_engagement+pages_manage_engagement+pages_read_user_content+business_management+pages_messaging+read_insights+pages_manage_metadata+ads_management+ads_read+leads_retrieval+pages_manage_ads&response_type=code&state=6a82deac1a69158ef81cb2bd-6a82deac1a69158ef81cb2cd-1786967668761-...",
  "state": "6a82deac1a69158ef81cb2bd-6a82deac1a69158ef81cb2cd-1786967668761-..."
}
```

* **Correct Endpoint:** `GET /v1/connect/facebook`
* **Platform Key:** `facebook` (Verified)
* **Scopes Included:** `pages_manage_posts`, `pages_show_list`, `pages_read_engagement`, `pages_messaging`, `read_insights`, `business_management`.

---

## 6. Meta / Facebook OAuth Configuration

* **OAuth Type:** **Zernio-Managed Meta OAuth**
* **Zernio Meta App ID:** `712341431446535`
* **Zernio Callback URL:** `https://zernio.com/api/v1/connect/facebook/callback`
* **Stage of Failure:** **BEFORE Facebook authorization** (The failure occurred during initial authorization URL generation due to the route and profile ID format mismatch; the live Zernio Meta OAuth endpoint itself is fully functional).

---

## 7. Webhook & Callback Specifications

1. **Callback:** Once authorized on Facebook, Meta redirects to `https://zernio.com/api/v1/connect/facebook/callback`.
2. **Webhook Dispatch:** Zernio dispatches an `account.connected` event to `https://rasalilabs.com/ralion/api/webhooks/zernio` with header `X-Zernio-Signature`.
3. **Client Redirect:** Zernio redirects user browser to `https://rasalilabs.com/ralion/growth?connected=facebook&provider=zernio`.

---

## 8. Root Cause Summary

| Root Cause ID | Layer | Description |
| :--- | :--- | :--- |
| **RC-1** | API Route | `/api/oauth/[provider]/connect/route.ts` was hardcoded to check only `FACEBOOK_APP_ID` rather than delegating to `SocialProviderRouter` when Zernio is active. |
| **RC-2** | Service Layer | `ZernioSocialService` parsed `id` instead of `_id` on profile objects, producing `Invalid profileId format` on connect endpoints. |
| **RC-3** | Database | `public.social_provider_profiles` and `public.social_connections` tables have not been created in the Supabase PostgreSQL database via SQL migration. |

---

## 9. Recommended Fix & Implementation Steps

1. **Update `apps/ralion/src/app/api/oauth/[provider]/connect/route.ts`:**
   Wire `/api/oauth/[provider]/connect` to query `SocialProviderRouter.resolveRouting({ platform, userId })`. If Zernio is active, retrieve the Zernio Connect URL via `ZernioSocialService.getConnectUrl(platform, profileId, redirectUri)`.
2. **Update `packages/integrations/src/social/services/ZernioSocialService.ts`:**
   Support `_id` field normalization across all profile and account models.
3. **Execute SQL Migration in Supabase:**
   Run `packages/database/migrations/20260817_zernio_social_infrastructure.sql` in the Supabase SQL editor.

---

## 10. Final Result

FACEBOOK CONNECTION FAILURE — ROOT CAUSE IDENTIFIED
