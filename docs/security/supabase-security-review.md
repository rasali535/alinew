# RALION — Supabase Cloud Security Configuration & Architecture Review

**Policy Reference:** SEC-REV-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Target:** Supabase Cloud Project `yidsfihagwttlmhfynmf`  
**Assessment Standard:** Meta Platform Data Protection Assessment  
**Date:** August 2026  

---

## 1. Executive Summary

Ralion leverages **Supabase Cloud** (managed PostgreSQL 15+, Supabase Auth, Storage, and Edge Network) as its unified backend data platform. This review audits the database security controls, Row Level Security policies, privileged key isolation, and Multi-Factor Authentication settings.

---

## 2. Row Level Security (RLS) Posture

Every table storing user or Platform Data enforces Row Level Security:

| Table | RLS Status | Access Policy Summary |
| :--- | :--- | :--- |
| `meta_connections` | **ENABLED** | Users can `SELECT` own metadata; `INSERT`/`UPDATE` restricted to server-side `service_role`. |
| `security_audit_logs` | **ENABLED** | Immutable append-only (`INSERT` allowed; `UPDATE`/`DELETE` prohibited; `SELECT` for Admins). |
| `security_review_records`| **ENABLED** | Restricted to `ADMINISTRATOR` / `OWNER` / `service_role`. |
| `security_alerts` | **ENABLED** | Restricted to `ADMINISTRATOR` / `OWNER` / `service_role`. |
| `social_account_tokens` | **ENABLED** | Isolated per `user_id = auth.uid()`. |
| `social_accounts_safe` | **VIEW** | Safe view omitting encrypted token columns entirely. |
| `customers` / `workspaces` | **ENABLED** | Multi-workspace tenant isolation via workspace membership checks. |

---

## 3. Privileged Key Separation & Service Role Isolation

* **Anonymous Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`):**
  Used exclusively in browser clients. Confined strictly to RLS policies based on `auth.uid()`.
* **Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`):**
  Used **strictly server-side** in secure Node.js API handlers (`/api/oauth/...`, `/api/meta/...`) and server background jobs. **Never exposed to frontend code or browser clients**.

---

## 4. Multi-Factor Authentication (MFA) Configuration

* **Admin Portal & Organization Roles:** Supabase TOTP (Time-based One-Time Password) MFA is enabled for administrative and privileged accounts.
* **Assurance Level:** Authenticated sessions verify `aal2` (Authenticator Assurance Level 2) for administrative endpoints.
* **Developer Infrastructure:** MFA is mandated across GitHub, Supabase Dashboard, and Meta for Developers organization accounts.
