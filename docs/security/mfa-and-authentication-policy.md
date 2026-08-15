# Ras Ali Labs MFA and Authentication Security Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform and Supporting Organizational Systems  
**Effective Date:** 15 August 2026 (`2026-08-15`)  
**Policy Classification:** Internal Security Policy — Authentication & Access Control  
**Compliance Standard:** Meta Data Protection Assessment (Multi-Factor Authentication & Strong Access Control)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd requires strong authentication controls to protect Ralion, Meta Platform Data, source code, deployment systems, backend infrastructure, and organizational systems from unauthorized access and account takeover.

Multi-factor authentication (MFA) is the required authentication control wherever supported across all organizational touchpoints and developer infrastructure.

---

## 2. Scope

This policy applies to all employees, contractors, developers, administrators, service operators, and other authorized personnel who access:

1. **Collaboration and communication tools**, including organizational email and communication platforms;
2. **Code repositories** and source-code management systems (e.g. GitHub);
3. **Software deployment and CI/CD systems** (e.g. GitHub Actions, production build systems, release management);
4. **Backend administrative tools**, including cloud platforms, databases, hosting environments, Supabase administration, and other privileged infrastructure tools.

---

## 3. MFA Requirement

> ### 🔒 MANDATORY POLICY REQUIREMENT: MULTI-FACTOR AUTHENTICATION
> **MFA is mandatory for all human access to collaboration and communication tools, code repositories, software deployment systems, and backend administrative tools whenever the system supports MFA.**

MFA must be enforced rather than merely recommended.

Where organizational or platform-level MFA enforcement is available (e.g. GitHub Organization 2FA enforcement, Supabase Dashboard TOTP MFA, Cloud Provider IAM MFA), Ras Ali Labs shall use the strongest applicable enforcement mechanism.

Users must not disable, bypass, or circumvent required MFA controls.

---

## 4. Collaboration and Communication Tools

All access to organizational collaboration and communication tools (including corporate email and workspace messaging) must use MFA.

Where supported, organizational administrators must use centralized or organization-wide enforcement mechanisms rather than relying solely on voluntary individual activation.

---

## 5. Code Repository Access

All access to code repositories and systems used to manage Ralion source code and configuration (such as GitHub) must require MFA (FIDO2 WebAuthn security keys or Time-based One-Time Passwords / TOTP).

Privileged repository administration, branch protection enforcement, and repository settings management must also be protected by MFA.

---

## 6. Software Deployment and CI/CD

All access to production deployment tools, CI/CD systems, build pipelines, release systems, and deployment administration must require MFA.

Where service accounts or automated deployment credentials (such as deployment tokens or deploy keys) are used, they must use appropriate non-interactive credential controls (least privilege, cryptographic key-based authentication) and must not bypass human MFA requirements for administrative access.

---

## 7. Backend Administrative Tools

All human administrative access to backend, cloud, database, and infrastructure management systems must require MFA.

This includes administrative access to systems supporting Ralion's Supabase backend environment (Supabase Dashboard, database connection settings, API keys), cloud hosting panels, and other production infrastructure.

---

## 8. Administrative Access

Privileged accounts must use MFA and must not be shared between individuals.

Access privileges must be limited according to least-privilege principles.

Administrative credentials must not be stored in source code or shared through insecure communication channels.

---

## 9. Authentication Recovery

MFA recovery procedures must verify the identity and authorization of the account owner before MFA is reset or bypassed.

Recovery codes and authentication recovery information must be protected as sensitive security credentials and stored securely offline or within encrypted administrative password vaults.

---

## 10. Account Lifecycle

MFA must be enabled before users are granted privileged access to in-scope systems.

When a user's access is terminated or changed, associated access credentials and authentication factors must be immediately removed, revoked, or updated in accordance with offboarding checklists.

---

## 11. Monitoring and Audit

Authentication and administrative security events must be logged or otherwise auditable where supported by the relevant platform.

In Ralion, authentication events (`AUTH_LOGIN`, `AUTH_LOGIN_FAILED`, `MFA_ENABLED`, `MFA_DISABLED`, `PASSWORD_CHANGED`, `ADMIN_LOGIN`, `ACCOUNT_LOCKED`) are automatically recorded in `security_audit_logs`.

Security events involving MFA changes, authentication failures, privilege changes, and account recovery must be reviewed regularly according to Ras Ali Labs security review procedures.

---

## 12. Alternative Authentication Protection

MFA is the organization's required protection for in-scope systems where MFA is supported.

Where MFA is genuinely unavailable on a legacy system and an alternative protection is used, the alternative protection **MUST satisfy all of the following requirements**:

### 12.1 Password Requirements
* Minimum password length: **14 characters**
* Password must contain at least one number and/or special character
* Password reuse must be restricted according to a defined password-history requirement (minimum 5 previous passwords remembered)
* Minimum password age: **1 day / 24 hours**

### 12.2 Failed Authentication Requirements
The system must implement authentication backoff delays OR temporary account lockout after consecutive failed login attempts.

The organization uses increasing authentication delays, such as:
$$\text{0 min} \longrightarrow \text{1 min} \longrightarrow \text{2 min} \longrightarrow \text{4 min} \longrightarrow \text{8 min}$$
or an equivalent protective mechanism.

Alternatively, the system enforces a temporary account lockout of at least **15 minutes after 5 consecutive failed login attempts**.

### 12.3 Hard Account Lockout
> **An automatic hard account lockout requiring IT/administrative reset must occur after 10 consecutive failed login attempts.**

*These alternative controls apply only where MFA is unavailable and must never be used to weaken an existing MFA requirement.*

---

## 13. Exceptions

Any exception to this policy must be formally documented, approved by an authorized security administrator, time-limited, and accompanied by compensating security controls.

An exception must never be used to bypass MFA where MFA is available and required.

---

## 14. Evidence and Verification

Ras Ali Labs maintains documented evidence demonstrating enforcement of authentication requirements, including:

* **GitHub Organization 2FA Enforcement:** Organization-level policy enforcing 2FA across all members and contributors.
* **Supabase Dashboard MFA:** Multi-factor authentication (TOTP) enabled for administrative access to the production Supabase project (`yidsfihagwttlmhfynmf`).
* **Deployment & CI/CD Protection:** Branch protection rules and MFA-protected deployment access.
* **Audit Logs:** Automated tracking of authentication and administrative actions in `security_audit_logs`.

*Exported configuration evidence and screenshots must not expose passwords, recovery codes, API keys, access tokens, secrets, or other private credentials.*

---

## 15. Mandatory Controls

The following statements are mandatory policy requirements across all Ras Ali Labs systems:

> ### 🛡️ Mandatory Control 1: Universal MFA Requirement
> **MFA is required for all access to collaboration and communication tools, code repositories, software deployment tools, and backend administrative tools where MFA is supported.**

> ### 🔐 Mandatory Control 2: Strict Alternative Authentication Baseline
> **Where MFA is unavailable, the alternative authentication mechanism must enforce a minimum 14-character password, a number and/or special character, password reuse restrictions, a minimum password age of 1 day, authentication backoff or temporary lockout after repeated failures, and automatic hard account lockout requiring administrative reset after 10 consecutive failed login attempts.**

---

## 16. Compliance Review

Ras Ali Labs periodically reviews authentication controls to ensure that MFA remains enabled and that organizational systems continue to enforce this policy.

Any identified authentication control weakness that could result in unauthorized access to Ralion or Meta Platform Data must be investigated and remediated promptly according to the organization's **Incident Response Policy** ([`docs/security/incident-response-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/incident-response-policy.md)).
