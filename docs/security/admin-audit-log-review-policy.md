# Ralion Administrative Audit Log Review and Account Compromise Detection Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform / Backend Environment  
**Policy Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team  
**Effective Date:** 15 August 2026 (`2026-08-15`)  
**Policy Classification:** Security Policy — Administrative Audit Log Review  
**Compliance Standard:** Meta Data Protection Assessment (Admin Audit Log Review & Account Compromise Detection)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd systematically reviews administrative audit logs associated with the Ralion backend environment to identify indicators that a privileged administrative account may have been compromised, misused, or operated without authorization.

The purpose of this review process is to detect suspicious privileged activity that could expose, modify, delete, or otherwise affect Meta Platform Data or compromise the security posture of Ralion's backend environment.

---

## 2. Scope

This policy applies to all administrative audit logs capturing actions performed by privileged accounts across:

* **Backend Infrastructure & Storage:** Supabase PostgreSQL database schemas, Row Level Security (RLS) policies, and credential vaults (`social_credentials`, `meta_connections`).
* **Authentication & IAM Administration:** Administrative user management, account locking/unlocking, and session management.
* **Roles and Permissions (RBAC):** Assignment or modification of elevated administrator roles and security permissions.
* **Multi-Factor Authentication (MFA):** Administrative MFA enforcement settings, factor resets, and recovery configurations.
* **Security, Logging & Alerting Configurations:** Changes to audit logging streams, log retention rules, security alerts, and threat tripwires.
* **Deployment & Operational Scripts:** Production code deployments, migration runners, and administrative CLI utilities.

*Managed Infrastructure Note:* Where backend infrastructure is operated by a managed service provider (e.g. Supabase Organization Console), Ras Ali Labs utilizes the provider's native administrative audit logs and access tracking facilities.

---

## 3. Mandatory 7-Day Administrative Audit Review

> ### 📅 MANDATORY POLICY REQUIREMENT: 7-DAY ADMIN AUDIT REVIEW
> **Ras Ali Labs shall review admin audit logs from the relevant backend environment at least every 7 days.**

The review is executed through a combination of **continuous automated anomaly detection** and a **mandatory weekly manual audit** conducted by authorized security architects. Every completed review is formally signed off and permanently stored in `public.security_review_records`.

---

## 4. In-Scope Threat Indicators for Admin Account Compromise

> ### 🔍 MANDATORY ADMINISTRATIVE COMPROMISE INDICATORS
> **The administrative review must evaluate logs against four primary compromise categories:**
> 1. **Unusual or Suspicious Administrator Login Patterns**
> 2. **Unexpected Access-Control Changes & Privilege Escalations**
> 3. **Unapproved Administrator Account Provisioning**
> 4. **Unauthorized Modifications to Logging, Monitoring, or Security Settings**

### 4.1 Administrator Login Review
The review inspects administrator authentication logs for:
* Administrator logins originating from unexpected geographic locations or unrecognized IP ranges.
* Administrative session authentications during anomalous or non-business hours.
* Repeated failed administrative login attempts ($\ge 5$ attempts) indicating credential stuffing or brute-force attacks.
* Unexpected account recovery, password reset, or MFA factor reset requests.

### 4.2 Access-Control & Permission Modifications
The review inspects logs for:
* Unauthorized alterations to PostgreSQL Row Level Security (RLS) policies on credential vaults (`social_credentials`).
* Unexpected role assignments (`ROLE_CHANGED`) or granular permission grants (`PERMISSION_GRANTED`).
* Elevation of standard user accounts to privileged administrator roles.
* Unauthorized adjustments to service-role API keys or token access boundaries.

### 4.3 New Administrator Provisioning & Reactivation
The review inspects logs for:
* Newly provisioned administrative accounts created without change management approval.
* Unplanned elevation of developer or support privileges.
* Reactivation of previously disabled, dormant, or departing employee accounts.

### 4.4 Logging, Monitoring & Security Configuration Changes
The review inspects logs for:
* Any attempt to disable, modify, truncate, or redirect audit logging streams in `security_audit_logs`.
* Adjustments to log retention periods below mandatory thresholds ($< 90$ days active / $< 1$ year compliance).
* Disabling or weakening of brute-force tripwires or security alert engines.
* Modifications to OAuth webhook signature verification or token encryption keys.

---

## 5. Review Methodology & Operational Workflow

The administrative audit review operates through the following structured workflow:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ADMINISTRATIVE AUDIT LOG REVIEW FRAMEWORK                   │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. Provider-Level Admin Audit Logs   │ 2. Application-Level Admin Logs      │
│    (Supabase Organization Console)   │    (Ralion `security_audit_logs`)    │
│ • Inspect console logins & IAM       │ • Query `event_category = 'ADMIN'`   │
│ • Verify database configuration acts │ • Review `event_type = 'ROLE_CHANGED'│
│ • Audit API key rotations            │ • Inspect `ACCOUNT_LOCKED` events    │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ 3. Sign-Off & Verification: Insert review entry into `security_review_records`│
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Log Extraction & Filtering:** Authorized reviewers access the Supabase Organization Audit Logs and Ralion Admin Security Center (`/enterprise/security`), filtering for `Category: ADMIN` and `Category: SECURITY` over the preceding 7-day window.
2. **Correlation & Change Validation:** Every recorded administrative action is cross-referenced against approved engineering change tickets.
3. **Anomaly Triage:** Unmatched or suspicious administrative actions are immediately flagged for threat analysis.
4. **Sign-off Entry:** The reviewer records the completed review in `public.security_review_records` capturing review date, total events inspected, and remediation sign-off.

---

## 6. Risk Triage & Incident Escalation

Identified administrative anomalies are classified according to potential impact on Meta Platform Data:

| Severity Level | Definition | Mandatory Response |
| :--- | :--- | :--- |
| **Authorized / Benign** | Verified maintenance or scheduled migration with change ticket. | Documented as approved administrative activity. |
| **Anomalous / Unconfirmed** | Administrator login from new IP address during business travel. | Out-of-band identity verification with administrator. |
| **Suspected Compromise** | Repeated failed admin logins followed by unexpected permission grant. | Immediate session termination, credential rotation, and audit lock. |
| **Confirmed Compromise** | Verified unauthorized administrative account access or RLS tampering. | Full incident escalation under Incident Response Policy; token revocation. |

---

## 7. Incident Escalation & Response Alignment

When administrative account compromise is suspected or confirmed:
1. **Immediate Session Termination:** Revoke active administrator sessions, force immediate password reset, and reset MFA credentials.
2. **Token & Vault Isolation:** Re-verify all stored Meta OAuth tokens; immediately execute remote revocation via Graph API (`DELETE /me/permissions`) if exposure is suspected.
3. **Forensic Timeline Reconstruction:** Extract all related actions performed by the compromised account from `security_audit_logs`.
4. **Platform Notification:** Comply with Meta Platform Terms and applicable regulatory breach notification obligations within required timeframes.

---

## 8. Audit Log Protection & Immutability

* **Append-Only Immutability:** The `security_audit_logs` table is protected by PostgreSQL RLS against modification or deletion.
* **No Silent Deletion:** Individual administrators cannot modify or truncate their own audit entries.
* **Credential Redaction:** Plaintext passwords, access tokens, App Secrets, and encryption keys are permanently filtered by `AuditLoggerService.sanitizeMetadata()` before storage.

---

## 9. Review Evidence Retention

* Completed review records in `public.security_review_records` are retained for a minimum of **1 year (365 days)** per the **Log Retention Policy** ([`docs/security/log-retention-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/log-retention-policy.md)).
* Retained evidence includes reviewer ID, timestamp, total events reviewed, detected anomalies, and signed outcome status.

---

## 10. Mandatory Meta Compliance Controls Summary

The following statements are mandatory requirements across all Ralion backend environments:

> ### 📅 Mandatory Control 1: Mandatory 7-Day Admin Audit Review
> **Ras Ali Labs reviews admin audit logs from the relevant Ralion backend environment at least every 7 days.**

> ### 👤 Mandatory Control 2: Admin Login Anomaly Detection
> **The review specifically looks for unusual administrator login patterns, including unexpected locations, unusual hours, and failed administrative login attempts.**

> ### 🛡️ Mandatory Control 3: Privilege Escalation & Access-Control Verification
> **The review identifies unexpected access-control changes, privilege escalations, new administrator accounts, and other changes that could expose Meta Platform Data to unauthorized users.**

> ### ⚙️ Mandatory Control 4: Security & Logging Configuration Integrity
> **The review identifies unexpected modifications to logging, monitoring, MFA, authentication, and security configurations.**

> ### 🚨 Mandatory Control 5: Incident Investigation & Escalation
> **Potential administrative-account compromise or misuse is investigated and escalated through the Ralion incident-response process.**

---

## 11. Evidence and Verification

Compliance with this policy is verified through:
* Schema tracking: `packages/database/migrations/20260815_meta_security_hardening.sql` (`security_review_records`).
* Logging implementation: `apps/ralion/src/lib/services/auditLogger.service.ts` (`ADMIN` & `SECURITY` categories).
* Admin Security Center UI: `apps/ralion/src/app/(dashboard)/enterprise/security/page.tsx`.
* Automated security audit check: `scripts/security-audit.js`.

---

## 12. Document Integrity & Sign-off

* **Document Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team
* **System Governed:** Ralion Platform / Backend Environment
* **Effective Date:** 15 August 2026 (`2026-08-15`)
* **Compliance Standard:** Meta Data Protection Assessment (Admin Audit Log Review)
* **Status:** Verified and approved for Meta compliance submission.
