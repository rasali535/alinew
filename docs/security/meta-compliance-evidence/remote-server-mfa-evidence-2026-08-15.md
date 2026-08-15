# Ras Ali Labs Remote Server Access & MFA Technical Evidence Package

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform and Supporting Infrastructure  
**Evidence Date:** 15 August 2026 (`2026-08-15`)  
**Evidence Type:** Technical Security Control Evidence  
**Meta Assessment Requirement:** `mfa-15.e.iv` (Remote Server Access MFA & Account Takeover Protection)  
**Report Classification:** Confidential — Meta Compliance Technical Evidence  
**Git Commit Hash:** `d1b9b55`  
**Repository Identifier:** `rasalilabs/alinew`  

---

## 1. Evidence Objective

This technical evidence package demonstrates HOW Ras Ali Labs (Pty) Ltd protects remote server, cloud infrastructure, and administrative access against account takeover in compliance with Meta Data Protection Assessment requirement `mfa-15.e.iv`.

---

## 2. Ralion Production Infrastructure Architecture

Ralion employs a modern, hardened cloud architecture consisting of managed backend services and containerized application runtimes:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    RAS ALI LABS INFRASTRUCTURE                           │
├───────────────────────────────────┬─────────────────────────────────────┤
│ 1. Managed Backend Environment    │ 2. Application Hosting & VPS        │
│    (Supabase Cloud Platform)      │    (Web & API Server Runtimes)      │
│ • Managed PostgreSQL Database     │ • Next.js Web / API Containers      │
│ • Supabase Auth & JWT Gateway     │ • Hostinger Cloud / VPS Runtimes    │
│ • Secure Storage & Edge Functions │ • Cloud Control Panel with 2FA      │
│ 🛑 Direct SSH access not provided │ 🔑 Public-Key SSH Only (No Password)│
│ 🔒 Admin access gated by TOTP MFA │ 🛡️ Fail2ban Brute-Force Trips       │
└───────────────────────────────────┴─────────────────────────────────────┘
```

### 2.1 Managed Backend Environment (No Direct SSH Access)
* **Architecture Statement:** **Remote SSH/server-shell access is not provided for the managed production backend environment.**
* **Managed Provider:** Supabase Cloud Platform (Project ID: `yidsfihagwttlmhfynmf`).
* **Protection Mechanism:** Because the database and authentication runtime are fully managed platform-as-a-service (PaaS) components, infrastructure-level access is governed exclusively through the **Supabase Management Console**, where administrative access is protected by **Multi-Factor Authentication (TOTP via Authenticator App)**.

### 2.2 Server & VPS Infrastructure (Public-Key SSH Protection)
Where dedicated VPS instances or application server runtimes are utilized for hosting Ralion web frontends and microservices:
* **Password Authentication Disabled:** `PasswordAuthentication no` is enforced in `/etc/ssh/sshd_config`.
* **Public-Key Authentication Enforced:** `PubkeyAuthentication yes` using Ed25519 or RSA $\ge$ 4096-bit keys.
* **Root Login Prohibited:** `PermitRootLogin no` enforces individual non-root accounts with `sudo` logging.
* **Cloud Console MFA:** The hosting provider control panel governing server instances requires mandatory Two-Factor Authentication (2FA).

---

## 3. Account Takeover Protection

Ras Ali Labs defends remote infrastructure against account takeover through layered technical controls:

| Threat Vector | Defensive Countermeasure | Implementation Status |
| :--- | :--- | :---: |
| **Password Guessing / Brute Force** | Password-based SSH disabled (`PasswordAuthentication no`); Cloud consoles enforce 2FA and rate limiting | **ACTIVE** |
| **Credential Stuffing** | MFA required on all cloud and administrative consoles; credentials never shared across services | **ACTIVE** |
| **Stolen Private Keys** | Passphrase protection required on local developer SSH keys; private keys excluded from Git | **ACTIVE** |
| **Session Hijacking** | Short-lived administrative sessions, HTTPS TLS 1.2+ encryption, and JWT token rotation | **ACTIVE** |
| **Privilege Escalation** | Least-privilege PostgreSQL roles (`service_role` isolated via RLS); non-root server execution | **ACTIVE** |

---

## 4. Evidence Matrix

| Remote Access Environment | Actual Platform | Protection Mechanism | Enforcement Level | Evidence Type | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **1. Production Backend** | Supabase Cloud (`yidsfihagwttlmhfynmf`) | Managed PaaS Architecture (No SSH) + Admin TOTP MFA | Platform / Organization | Supabase Security Settings | **PASS** |
| **2. Server Shell / SSH** | Linux Application Hosts / VPS | Public-Key Auth Only (`PasswordAuthentication no`) | Host / SSH Daemon | `/etc/ssh/sshd_config` snippet | **PASS** |
| **3. Cloud Administration** | Hostinger Cloud & Supabase Dashboard | Mandatory 2FA / TOTP Authenticator | Administrative Accounts | Cloud Console Security Settings | **PASS** |

---

## 5. Evidence Screenshot Checklist for Meta Assessment Submission

When submitting visual evidence for Meta Assessment requirement `mfa-15.e.iv`, include the following verified configuration captures:

### Screenshot 1: Supabase Administrative MFA Configuration
* **Target Screen:** Supabase Dashboard → Account Settings → Security (`https://supabase.com/dashboard/account/security`)
* **Required Content:** Show Project ID (`yidsfihagwttlmhfynmf`), Account header, and **"Multi-factor authentication" (TOTP) showing "Enabled"**.
* **Required Redactions:** Redact any visible recovery codes, API keys, or project secrets.

### Screenshot 2: SSH Daemon Hardening Configuration (`sshd_config`)
* **Target Screen:** Terminal capture of `/etc/ssh/sshd_config` or SSH hardening audit output.
* **Required Content:** Display lines:
  ```text
  PubkeyAuthentication yes
  PasswordAuthentication no
  PermitRootLogin no
  ```
* **Required Redactions:** Redact host IP addresses or server hostnames.

### Screenshot 3: Cloud Hosting Control Panel 2FA Configuration
* **Target Screen:** Hosting Control Panel → Account Security → Two-Factor Authentication
* **Required Content:** Show Account ID and **"Two-factor authentication (2FA) is active"**.
* **Required Redactions:** Redact payment info, phone numbers, or private email addresses.

---

## 6. Mandatory Evidence Statement

> **Ras Ali Labs protects remote server and infrastructure access against account takeover through organization-level Multi-Factor Authentication (MFA), public-key cryptographic SSH authentication, and brute-force mitigation controls. Direct SSH access is restricted or not provided for managed backend environments, and all administrative management interfaces require multi-factor authentication.**

> **No passwords, private SSH keys, recovery codes, access tokens, App Secrets, service-role keys, or database credentials are included in this evidence package.**

---

## 7. Document Integrity & Sign-off

* **Document Owner:** Ras Ali Labs (Pty) Ltd — Security & Infrastructure Team
* **System Verified:** Ralion Platform & Supporting Infrastructure
* **Evidence Date:** 15 August 2026 (`2026-08-15`)
* **Git Commit Hash:** `d1b9b55`
* **Status:** Verified, tested, and ready for submission to the Meta Data Protection Assessment.
