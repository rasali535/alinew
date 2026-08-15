# Ras Ali Labs Remote Server Access and MFA Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform and Supporting Infrastructure  
**Effective Date:** 15 August 2026 (`2026-08-15`)  
**Policy Classification:** Internal Security Policy — Remote Access  
**Compliance Standard:** Meta Data Protection Assessment (`mfa-15.e.iii` — Remote Server Access MFA & Access Controls)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd requires strong authentication controls for all remote access to servers and infrastructure used to operate, maintain, deploy, or administer Ralion.

The purpose of this policy is to prevent unauthorized remote access and account takeover involving server environments that may process or support Meta Platform Data.

---

## 2. Scope

This policy applies to:

* SSH access
* Remote shell access
* Remote server administration
* Cloud/server administration consoles
* Privileged infrastructure access
* Remote management interfaces providing equivalent server-level access

The policy applies to all employees, contractors, administrators, developers, and other authorized personnel who interact with Ralion systems.

Where a production environment is hosted on fully managed cloud services (e.g. Supabase managed PostgreSQL, serverless Edge runtimes) without direct SSH access, administrative management interfaces remain strictly governed by the MFA and access-control requirements of this policy.

---

## 3. MFA Requirement for Remote Server Access

> ### 🔒 MANDATORY CONTROL: MULTI-FACTOR AUTHENTICATION FOR REMOTE ACCESS
> **Multi-factor authentication (MFA) is required for all human remote access to servers, cloud control panels, and server-administration interfaces where MFA is supported.**

Remote server access must not rely solely on a username and password where MFA is available.

MFA must be enforced at the organizational/platform level where the infrastructure supports centralized enforcement (such as Cloud IAM 2FA, Supabase Dashboard TOTP MFA, and Identity Provider 2-Step Verification).

Shared administrator accounts are strictly prohibited.

---

## 4. Privileged Access

Remote administrative access must follow least-privilege principles:

* Users receive only the minimum access necessary for their operational responsibilities.
* Privileged access must be separately controlled and protected using MFA where supported.
* Remote access credentials must never be shared between individuals.

---

## 5. Alternative Authentication Controls

Where MFA is unavailable for a particular legacy remote-access mechanism or server interface, the alternative authentication mechanism **MUST satisfy ALL requirements below**:

### 5.1 Password Requirements
* Contain at least **14 characters**;
* Contain at least one number and/or special character;
* Prohibit password reuse according to a defined password-history requirement (minimum 5 previous passwords remembered); and
* Enforce a minimum password age of **1 day / 24 hours**.

### 5.2 Failed Login Protection
The remote-access system must implement authentication backoff delays OR temporary account lockouts after consecutive failed authentication attempts.

Preferred backoff behavior uses progressively increasing delays:
$$\text{0 min} \longrightarrow \text{1 min} \longrightarrow \text{2 min} \longrightarrow \text{4 min} \longrightarrow \text{8 min}$$
or an equivalent protective mechanism.

Alternatively, the system imposes a temporary account lockout of at least **15 minutes after 5 consecutive failed login attempts**.

### 5.3 Automatic Hard Account Lockout
> ### 🛑 MANDATORY HARD ACCOUNT LOCKOUT
> **After 10 consecutive failed login attempts, the account must be automatically hard locked and require an IT/security administrator to restore access.**

Users must not be able to independently bypass this hard-lock condition.

---

## 6. SSH Key Authentication

Where SSH access is configured on infrastructure components:

* **Key Requirements:** Public-key cryptographic authentication (Ed25519 or RSA $\ge$ 4096-bit) is mandatory; password-based SSH authentication must be disabled (`PasswordAuthentication no`).
* **Root Login Disabled:** Direct root login via SSH is disabled (`PermitRootLogin no`); administrative operations require individual authenticated sessions with `sudo`.
* **Private Key Protection:** Private SSH keys must never be committed to source control, shared via chat/email, embedded in application code, or exposed in logs.
* **Passphrase Protection:** Private keys stored on administrator endpoints must use passphrase protection.

---

## 7. Credential Protection

Remote-access credentials must be stored and handled securely:

* Passwords, private keys, access tokens, and other authentication credentials must not be written to application logs or administrative audit logs in cleartext.
* In Ralion, `AuditLoggerService.sanitizeMetadata()` automatically suppresses all credential and key parameters from audit logs.
* Credentials must never be embedded in source code or distributed client software.

---

## 8. Access Lifecycle

Remote access is granted strictly to authorized personnel:

* When personnel change roles or depart the organization, access is reviewed immediately.
* Unnecessary privileges are revoked, SSH authorized keys are purged, credentials are rotated, and MFA enrollments are terminated.

---

## 9. Monitoring and Audit

Remote authentication events and privileged administrative actions are logged where supported:

* Repeated failed logins are monitored and alert thresholds are enforced (e.g. `AUTH_LOGIN_FAILED` in `security_audit_logs`).
* Administrative actions and role changes trigger `ADMIN_ACTION` and `ROLE_CHANGED` audit records.
* Logs must never expose passwords, private keys, access tokens, or other authentication secrets.

---

## 10. Incident Response

Suspected unauthorized remote access must be investigated under the **Ras Ali Labs Incident Response Policy** ([`docs/security/incident-response-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/incident-response-policy.md)).

Containment actions include:
* Disabling compromised accounts;
* Revoking SSH keys and active session tokens;
* Rotating environment secrets and service keys;
* Reviewing audit logs and assessing any impact on Meta Platform Data.

---

## 11. Mandatory Meta Controls

The following controls are mandatory across all Ras Ali Labs infrastructure:

> ### 🔒 Mandatory Control 1: Universal MFA for Remote Access
> **MFA is required for all human remote access to servers and server-administration interfaces where MFA is supported.**

> ### 🔑 Mandatory Control 2: Strict Alternative Password Baseline
> **Where MFA is unavailable, remote access must enforce a minimum 14-character password, a number and/or special character, password reuse restrictions, and a minimum password age of 1 day.**

> ### ⏳ Mandatory Control 3: Authentication Backoff / Lockout
> **Where MFA is unavailable, remote access must implement authentication backoff delays or temporary account lockout after repeated failed authentication attempts.**

> ### 🛑 Mandatory Control 4: Hard Account Lockout
> **After 10 consecutive failed login attempts, the account must be automatically hard locked and require IT/security administrator intervention to restore access.**

---

## 12. Evidence and Compliance

Ras Ali Labs maintains evidence demonstrating remote-access authentication controls, including:

* Cloud and server administrative MFA settings (Supabase Dashboard TOTP MFA, Cloud Console 2FA);
* Identity provider authentication policies;
* Automated security audit scanner verification ([`scripts/security-audit.js`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/scripts/security-audit.js));
* Access-control policy documentation.

*No passwords, private keys, tokens, recovery codes, or other authentication secrets are included in evidence documents.*

---

## 13. Infrastructure Applicability

* **Managed Cloud Infrastructure:** The Ralion production backend database, authentication services, and storage are hosted on managed Supabase Cloud infrastructure (`yidsfihagwttlmhfynmf.supabase.co`). Administrative access is managed via the Supabase Dashboard, which enforces MFA (TOTP).
* **Application Hosting:** Web and API services are deployed on hardened server environments where administrative control panels require mandatory 2FA.

---

## 14. Document Integrity & Sign-off

* **Document Owner:** Ras Ali Labs (Pty) Ltd — Security & Infrastructure Team
* **System Governed:** Ralion Platform & Supporting Infrastructure
* **Effective Date:** 15 August 2026 (`2026-08-15`)
* **Standard:** Meta Data Protection Assessment — `mfa-15.e.iii`
* **Status:** Verified and approved for Meta compliance submission.
