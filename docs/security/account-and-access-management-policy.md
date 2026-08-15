# Ras Ali Labs Account and Access Management Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform and Supporting Systems  
**Policy Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team  
**Effective Date:** 15 August 2026 (`2026-08-15`)  
**Policy Classification:** Internal Security Policy — Account and Access Management  
**Compliance Standard:** Meta Data Protection Assessment (Account & Access Management / Prompt Revocation Requirements)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd maintains a structured, auditable process for granting, reviewing, modifying, and promptly revoking access to all organizational systems used to develop, deploy, administer, and operate the Ralion platform.

The purpose of this policy is to ensure that access to systems processing, storing, or transmitting Meta Platform Data remains strictly limited to authorized personnel and is immediately removed when access is no longer justified, no longer actively used, or when personnel depart the organization.

---

## 2. Scope

This policy applies to all accounts, credentials, and access permissions across all in-scope systems, including:

* **Source Code Repositories:** GitHub Organization accounts, repository access permissions, and personal access tokens (PATs).
* **Backend & Database Infrastructure:** Supabase Organization Console, PostgreSQL database roles, connection strings, and service-role API keys.
* **Cloud Infrastructure & Hosting:** Cloud hosting management panels (Hostinger), VPS administrative interfaces, and SSH key authorizations.
* **CI/CD & Deployment Pipelines:** Production build pipelines, deployment triggers, and release signing secrets.
* **Collaboration & Communication Tools:** Google Workspace corporate email accounts (`@rasalilabs.com`), internal messaging, and issue tracking.
* **Application Security Administration:** Ralion Admin Security Center (`/enterprise/security`), `security_audit_logs`, and token vault credentials (`social_credentials`).

---

## 3. Access Provisioning Principles

1. **Principle of Least Privilege:** Access is granted strictly on a need-to-know basis, providing only the minimum permissions necessary for the individual's specific operational responsibilities.
2. **Business Need Justification:** All new account requests require documented administrative justification and approval from an authorized security administrator.
3. **Mandatory MFA for Privileged Accounts:** All privileged administrative and repository accounts must enforce multi-factor authentication (TOTP or FIDO2/WebAuthn security keys) in accordance with the **MFA and Authentication Policy** ([`docs/security/mfa-and-authentication-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/mfa-and-authentication-policy.md)).

---

## 4. Mandatory 12-Month Access Review

> ### 📅 MANDATORY POLICY REQUIREMENT: ANNUAL ACCESS REVIEW
> **Ras Ali Labs shall review all access grants at least once every 12 months.**

An authorized security administrator conducts a formal audit of all active user accounts, group memberships, repository permissions, and backend privileges across all systems at least once every 12 months.

The review explicitly evaluates whether each active access grant is:
* **Still Required:** Justified by the individual's current role and duties.
* **Still Actively Used:** Exhibiting regular authentication within the preceding 90 days.
* **Appropriately Privileged:** Aligned with the principle of least privilege, without accumulated or excessive permissions.

---

## 5. Revocation of Access No Longer Required

> ### 🚫 MANDATORY CONTROL: REVOCATION OF UNREQUIRED ACCESS
> **Access that is no longer required must be revoked promptly.**

When an individual's project responsibilities, functional role, or organizational duties change such that access to a specific repository, backend database, or cloud console is no longer needed, an administrator must revoke the corresponding permissions **within 24 hours**.

---

## 6. Revocation of Dormant or Unused Access

> ### ⏱️ MANDATORY CONTROL: REVOCATION OF UNUSED ACCESS
> **Access that is no longer being used must be revoked promptly.**

Accounts or access grants exhibiting no recorded login or activity for **90 consecutive days** are flagged as dormant. Security administrators review dormant accounts during periodic access evaluations and promptly disable or revoke access if no ongoing operational justification is provided.

---

## 7. Offboarding & Departure Access Revocation

> ### 🚪 MANDATORY CONTROL: PROMPT DEPARTURE ACCESS REVOCATION
> **All access must be revoked promptly when a person leaves Ras Ali Labs.**

Upon termination of employment, end of contractor engagement, or formal departure from Ras Ali Labs, an authorized administrator executes the offboarding checklist immediately (and no later than the individual's final working hour):

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                   OFFBOARDING ACCESS REVOCATION CHECKLIST                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. GitHub Organization          : Remove from organization & team access    │
│ 2. Supabase Console             : Remove organization member / revoking IAM │
│ 3. Cloud / VPS Hosting          : Revoke console access & remove SSH keys   │
│ 4. Google Workspace / SSO       : Suspend account & revoke active sessions  │
│ 5. Deployment Secrets & PATs    : Revoke active API tokens & personal keys  │
│ 6. Password & MFA Enrollments   : Invalidate stored MFA factors & sessions  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Role Changes and Permission Adjustments

When an employee or contractor transitions between roles or teams:
1. Existing permissions are audited; permissions associated exclusively with the prior role are immediately revoked.
2. New permissions are individually requested, justified, and approved under least-privilege principles.
3. Permissions must never be allowed to accumulate across successive roles.

---

## 9. Offboarding & Disablement Workflow

The technical disablement process includes:
* **Session Invalidation:** Terminating all active OAuth and browser sessions across Google Workspace, GitHub, and Supabase.
* **Membership Deletion:** Removing the user from GitHub repositories, Supabase organizations, and internal groups.
* **Credential Shredding:** Invalidating personal access tokens, developer API keys, and removing authorized SSH public keys.
* **MFA Disenrollment:** De-authorizing registered TOTP apps and security keys.

---

## 10. Evidence and Recordkeeping

Ras Ali Labs maintains complete, timestamped records of:
* Initial access grant requests and approvals.
* Annual (12-month) access review logs and completed audit checklists.
* Timestamps of access adjustments, role changes, and offboarding revocations.
* Audit trail entries in `security_audit_logs` (`ROLE_CHANGED`, `PERMISSION_REVOKED`, `ACCOUNT_LOCKED`).

---

## 11. Mandatory Meta Compliance Controls Summary

The following statements represent mandatory organizational security controls across Ras Ali Labs:

> ### 📅 Mandatory Control 1: Annual Access Review & Removal
> **Ras Ali Labs reviews all access grants at least once every 12 months and revokes access that is no longer required.**

> ### ⏱️ Mandatory Control 2: Prompt Revocation of Unused Access
> **Ras Ali Labs reviews access and revokes access that is no longer being used.**

> ### 🚪 Mandatory Control 3: Immediate Departure Revocation
> **Ras Ali Labs promptly revokes all applicable access grants when a person leaves the organization.**

---

## 12. Responsibilities

* **Security Architecture Team:** Responsible for conducting annual access reviews, auditing dormant accounts, and maintaining least-privilege configurations.
* **System Administrators:** Responsible for executing immediate access provisioning, modification, and offboarding revocations across GitHub, Supabase, and cloud platforms.
* **Team Leads / Managers:** Responsible for notifying security administrators immediately upon any personnel role transition, contractor completion, or employee resignation.

---

## 13. Document Integrity & Sign-off

* **Document Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team
* **System Governed:** Ralion Platform & Supporting Infrastructure
* **Effective Date:** 15 August 2026 (`2026-08-15`)
* **Compliance Standard:** Meta Data Protection Assessment (Account & Access Management)
* **Status:** Verified and approved for Meta compliance submission.
