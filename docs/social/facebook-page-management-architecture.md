# Ralion OS — Facebook Page Management & Multi-Destination Architecture

**Version:** 3.0  
**Date:** 17 August 2026  
**Author:** Ras Ali Labs (Pty) Ltd  

---

## 1. Executive Summary

Ralion OS has transitioned from a single-account "Facebook Connected" toggle into an enterprise-grade **Facebook Page Management and AI Growth Intelligence** system.

This architecture enables:
- **Server-Side Authoritative Page Discovery:** Multi-page enumeration via Zernio profiles (`6a82deac1a69158ef81cb2cd`) and Meta Graph APIs without auto-selecting destination accounts.
- **Explicit Page Selection UX:** Clear state representation (`AVAILABLE`, `SELECTED`, `CONNECTED`, `LOCKED/Upgrade Required`).
- **Strict Subscription Entitlement Enforcement:** Authoritative limits per `organization_id` (`facebook_page_limit`), preventing multi-user bypass and direct API exploitation.
- **Dedicated Facebook Page Workspace:** Real-time post feed, normalized KPIs, and Mari AI Growth Intelligence.

---

## 2. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                            RALION SOCIAL COMMAND CENTER                           |
+-----------------------------------------------------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
      [Facebook Page Discovery]               [Server-Side Entitlement Layer]
  - GET /api/social/facebook/pages            - Validates org facebook_page_limit
  - Scans Zernio & Meta Profiles              - Blocks excess destinations (403)
                   |                                       |
                   +-------------------+-------------------+
                                       |
                                       v
                    [Facebook Page Workspace & Destination]
                   - Connected Page: Ras Ali Labs (477334159265235)
                   - Real Posts Feed & Engagement (Likes/Comments/Reach)
                   - Normalized Analytics (+13.1% Reach Growth)
                                       |
                                       v
                     [Mari AI Facebook Growth Intelligence]
                   - Context-scoped analysis (MariPageContext)
                   - Zero tokens / secrets passed to AI models
                   - 7-Day Strategy Generator with direct Composer Transfer
```

---

## 3. Database Schema

### `public.social_destinations`
Stores managed Page destinations per organization with unique constraints:
- `id` UUID PRIMARY KEY
- `organization_id` UUID
- `workspace_id` UUID
- `user_id` UUID (creator)
- `provider` TEXT ('facebook')
- `platform` TEXT ('facebook')
- `infrastructure_provider` TEXT ('zernio')
- `provider_account_id` TEXT
- `provider_page_id` TEXT NOT NULL
- `page_name` TEXT NOT NULL
- `page_username` TEXT
- `followers_count` BIGINT
- `status` TEXT ('CONNECTED', 'DISCONNECTED', 'LOCKED')
- `is_active` BOOLEAN
- `capabilities` JSONB
- `CONSTRAINT uq_org_platform_page UNIQUE(organization_id, platform, provider_page_id)`

### `public.organization_social_entitlements`
- `organization_id` UUID PRIMARY KEY
- `facebook_page_limit` INT NOT NULL DEFAULT 1
- `custom_limits` JSONB
- `updated_at` TIMESTAMPTZ

---

## 4. Security & Compliance
- **Zero Token Exposure:** Access tokens, refresh tokens, and Zernio API keys are isolated server-side and never exposed to the frontend or AI prompt contexts.
- **Tenant Isolation:** All operations are strictly scoped to the caller's verified `organization_id`.
