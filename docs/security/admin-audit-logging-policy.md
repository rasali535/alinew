# Ralion Admin Audit Logging Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform / Backend Environment  
**Policy Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team  
**Effective Date:** 15 August 2026 (`2026-08-15`)  
**Policy Classification:** Security Policy — Administrative Audit Logging  
**Compliance Standard:** Meta Data Protection Assessment (`auditlog-22` — Administrative Audit Logging & Privileged Activity Tracking)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd maintains administrative audit logging across backend and application environments where Meta Platform Data is stored, transmitted, or processed.

The purpose of administrative audit logging is to establish a comprehensive, tamper-evident, and reliable record of all actions performed by users with elevated privileges. This supports proactive threat detection, security incident investigation, non-repudiation, administrative accountability, and rapid response to unauthorized or anomalous administrative activity.

---

## 2. Scope

This policy applies to all privileged administrative activities affecting:

* **Backend Databases & Storage:** PostgreSQL database schemas, Row Level Security (RLS) policies, and credential vaults (`social_credentials`, `meta_connections`).
* **Authentication & User Administration:** Administrative user creation, account locking/unlocking, and session revocation.
* **Access-Control & RBAC Configuration:** Role assignments, permission grants, and API security scope management.
* **MFA & Authentication Factor Management:** Administrative MFA configuration, factor resets, and authentication policy adjustments.
* **Deployment & Infrastructure Administration:** Production deployment workflows, database migrations, and server runtime configurations.
* **Logging & Monitoring Configuration:** Audit log configuration, retention rules, security alerts, and threat tripwires.
* **Platform Data Protection Systems:** Meta user data deletion callback handlers, encryption key configuration, and token revocation routines.

*Applicability:* This policy applies to all directly managed Ralion backend services and privileged administrative interfaces provided by managed infrastructure providers (e.g. Supabase Organization Console, Cloud Hosting Panels).

---

## 3. Admin Audit Log Requirement

> ### 📜 MANDATORY CONTROL: ELEVATED PRIVILEGE AUDIT LOGGING
> **Administrative actions performed by users with elevated privileges must be recorded in an auditable administrative log where the underlying system provides the capability.**

Admin audit logs must capture sufficient contextual information to uniquely identify the administrative action taken, the initiating actor/administrator, the affected target resource, the exact timestamp, and the operation outcome.

---

## 4. In-Scope Administrative Events

> ### 🔍 MANDATORY ADMINISTRATIVE EVENT COVERAGE
> **Administrative audit logging covers privileged actions including program and script execution, account creation and disabling, password resets, MFA changes, privilege escalation, and logging configuration changes.**

The administrative audit logging engine captures the following event categories across Ralion and its backend environment:

### 4.1 Program and Script Execution
* Execution of database schema migration scripts (`packages/database/migrations/*`).
* Execution of backend maintenance jobs, token refresh schedulers, and administrative CLI scripts (`ADMIN_ACTION`).

### 4.2 Account Creation and Disabling
* Administrative provisioning of new organizational admin accounts.
* Automatic or administrative account lockout after repeated failed authentication attempts (`ACCOUNT_LOCKED`).
* Administrative unlocking and reactivation of accounts (`ACCOUNT_UNLOCKED`).

### 4.3 Password and Authentication Factor Changes
* Administrative password reset triggers and credentials rotation (`PASSWORD_RESET`, `PASSWORD_CHANGED`).
* Administrative MFA enrollment, factor resets, or policy modifications (`MFA_ENABLED`, `MFA_DISABLED`).

### 4.4 Privilege and Access-Control Modifications
* Assignment or revocation of administrative roles (`ROLE_CHANGED`).
* Elevation or modification of granular system permissions (`PERMISSION_GRANTED`, `PERMISSION_REVOKED`).
* Modifications to PostgreSQL Row Level Security (RLS) policies.

### 4.5 Logging Configuration Changes
* Any attempt to create, modify, alter retention periods, disable, or redirect audit logging streams.
* Security alerts triggered by threshold breaches or tripwires (`SECURITY_ALERT`).

### 4.6 Data-System Administrative Actions
* Administrative invocation of the Meta user data deletion purge (`POST /api/meta/data-deletion`).
* Account disconnection and cryptographic token shredding (`META_DISCONNECT`, `META_TOKEN_REVOKED`).

---

## 5. Log Content & Mandatory Data Schema

Administrative audit log entries in the `security_audit_logs` table contain the following structured fields:

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Unique cryptographic identifier generated per log entry. |
| `event_type` | `VARCHAR(64)` | Standardized event enum (e.g. `ADMIN_ACTION`, `ROLE_CHANGED`, `ACCOUNT_LOCKED`). |
| `event_category` | `VARCHAR(32)` | High-level category: `ADMIN`, `AUTH`, `META`, `SECURITY`, `RBAC`. |
| `user_id` | `UUID` | Target user account affected by the administrative operation. |
| `actor_user_id` | `UUID` | Unique identifier of the privileged administrator initiating the action. |
| `meta_user_id` | `VARCHAR(128)` | Associated Meta User ID (when the action affects Meta Platform Data). |
| `resource_type` | `VARCHAR(64)` | Target system component (e.g. `schema`, `vault`, `user_account`, `rls_policy`). |
| `resource_id` | `VARCHAR(128)` | Unique identifier of the resource modified. |
| `ip_address` | `INET / VARCHAR` | Client IP address of the initiating administrator. |
| `user_agent` | `TEXT` | Browser / CLI user agent string. |
| `success` | `BOOLEAN` | Boolean result indicating whether the administrative action succeeded. |
| `metadata` | `JSONB` | Structured operational metadata (sanitized of sensitive credentials). |
| `created_at` | `TIMESTAMPTZ` | High-precision UTC timestamp generated at time of event recording. |

### Absolute Secret Redaction:
**Logs must NEVER contain plaintext Meta access tokens, App Secrets, passwords, encryption keys, or authentication cookies.** All metadata is automatically processed through `AuditLoggerService.sanitizeMetadata()` prior to persistent storage.

---

## 6. Application Audit Logging vs. Admin Audit Logging

Ralion enforces a strict architectural distinction between application-level event logging and privileged backend administrative audit logging:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RALION LOGGING ARCHITECTURE                        │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. Application Event Audit Logs      │ 2. Administrative Audit Logs         │
│    (End-User & System Activity)      │    (Privileged Operator Activity)    │
│ • User OAuth Handshake & Connect     │ • Database Schema & RLS Changes      │
│ • Social Post Publishing Events      │ • Administrator Login & Session Init │
│ • Webhook Ingestion & Signature Fail │ • RBAC Role & Permission Changes     │
│ • Rate Limit Backoff Invocations     │ • User Account Locking / Unlocking   │
│ • End-User Credential Disconnect     │ • Threat Detection Tripwire Alerts   │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

Application event logs record routine system operations, while administrative audit logs track elevated actions that alter system configuration or access boundaries.

---

## 7. Protection of Admin Audit Logs

> ### 🛡️ MANDATORY CONTROL: AUDIT LOG IMMUTABILITY & TAMPER-RESISTANCE
> **Administrative audit logs are protected against unauthorized modification and deletion and are reviewed for indicators of administrator account compromise or misuse.**

1. **Append-Only Storage:** The `security_audit_logs` database table prohibits `UPDATE` operations via Row Level Security and triggers.
2. **Access Isolation:** Only authorized security auditors and backend service workers (`service_role`) can query the full administrative audit trail.
3. **No Silent Deletion:** Individual administrators cannot modify or truncate their own audit entries without generating an auditable event.

---

## 8. Retention Period

Administrative audit logs are retained in accordance with the **Ralion Log Retention Policy** ([`docs/security/log-retention-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/log-retention-policy.md)):
* **Active Administrative Logs:** Retained in online queryable storage for a minimum of **90 days**.
* **Compliance & Security Review Records:** Retained in immutable archive storage for a minimum of **1 year (365 days)**.

---

## 9. Monitoring and Periodic Security Review

Ras Ali Labs performs structured monitoring of administrative logs:
* **Real-Time Tripwires:** The `SecurityMonitorService` inspects administrative logs for suspicious patterns (repeated failed logins, rapid privilege escalations).
* **7-Day Security Review Cycle:** Authorized security personnel conduct and document weekly administrative reviews in `security_review_records`.

---

## 10. Security Event Escalation

Where administrative audit logs reveal unauthorized access attempts or suspicious privilege manipulation:
1. The incident is immediately escalated under the **Incident Response Policy** ([`docs/security/incident-response-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/incident-response-policy.md)).
2. Privileged sessions are terminated and credentials rotated.
3. An impact assessment is performed to verify whether any Meta Platform Data was exposed or modified.

---

## 11. Mandatory Meta Compliance Controls Summary

The following statements are mandatory requirements across all Ralion backend environments:

> ### 🔒 Mandatory Control 1: Administrative Audit Collection
> **Ras Ali Labs collects administrative audit logs for privileged backend activity affecting systems where Meta Platform Data is stored or processed.**

> ### 🔍 Mandatory Control 2: Comprehensive Event Scope
> **Administrative audit logging covers, where supported, privileged actions such as executing programs or scripts, creating or disabling accounts, resetting passwords, changing MFA configurations, changing privileges, and modifying or disabling logging configurations.**

> ### 🛡️ Mandatory Control 3: Tamper Protection and Misuse Monitoring
> **Administrative audit logs are protected against unauthorized modification and deletion and are reviewed for indicators of administrator account compromise or misuse.**

---

## 12. Backend Provider & Managed-Service Logging Integration

* **Supabase Cloud Infrastructure:** For managed PaaS database and auth services, Ras Ali Labs utilizes Supabase Organization Audit Logs and Postgres Activity Logs, capturing administrative console logins, connection pool modifications, and API key management.
* **Ralion Application Layer:** The `AuditLoggerService` natively records all administrative operations, role changes, and security alerts within the application's PostgreSQL `security_audit_logs` table.

---

## 13. Evidence and Verification

Compliance with this policy is verified through the following repository evidence:
* Database migration schema: `packages/database/migrations/20260815_meta_security_hardening.sql` (`security_audit_logs`, `security_review_records`).
* Logging service implementation: `apps/ralion/src/lib/services/auditLogger.service.ts`.
* Admin Security Center UI: `apps/ralion/src/app/(dashboard)/enterprise/security/page.tsx`.
* Automated security audit check: `scripts/security-audit.js` (`[PASS] AuditLoggerService: All required Meta application events supported`).

---

## 14. Document Integrity & Sign-off

* **Document Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team
* **System Governed:** Ralion Platform & Backend Environment
* **Effective Date:** 15 August 2026 (`2026-08-15`)
* **Compliance Standard:** Meta Data Protection Assessment — `auditlog-22`
* **Status:** Verified and approved for Meta compliance submission.
