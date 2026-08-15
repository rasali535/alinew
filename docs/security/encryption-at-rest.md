# RALION — Encryption at Rest Architecture & Evidence

**Policy Reference:** SEC-POL-003  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Standard:** Meta Platform Data Protection Assessment (Requirement: Written Explanation & Evidence for Encryption at Rest)  
**Effective Date:** August 2026  

---

## 1. Executive Summary

This document describes the multi-layered encryption at rest strategy employed across Ralion to protect **Meta Platform Data**, user credentials, and application storage, fulfilling the specific evidence criteria mandated by the **Meta Data Protection Assessment**.

Ralion implements **dual-layer encryption at rest**:
1. **Infrastructure / Storage Layer:** Transparent AES-256 block-level disk encryption managed by Supabase Cloud (AWS/GCP physical hardware with FIPS 140-2 validated cryptographic modules).
2. **Application / Column Layer:** Dedicated **AES-256-GCM authenticated encryption** for all Meta OAuth access tokens and refresh tokens prior to database insertion.

---

## 2. Data Classification & Storage Matrix

| Data Classification | Storage Location | Encryption Mechanism | Key Management |
| :--- | :--- | :--- | :--- |
| **Meta Access Tokens** | `meta_connections.encrypted_access_token` | **AES-256-GCM** (Application) + **AES-256** (Disk) | `OAUTH_ENCRYPTION_KEY` (Server Environment) |
| **Meta Refresh Tokens** | `meta_connections.encrypted_refresh_token` | **AES-256-GCM** (Application) + **AES-256** (Disk) | `OAUTH_ENCRYPTION_KEY` (Server Environment) |
| **Meta User ID & Profile** | `meta_connections` table | **AES-256** (Database tablespace encryption) | Supabase Cloud KMS |
| **Audit Logs** | `security_audit_logs` table | **AES-256** (Database tablespace encryption) | Supabase Cloud KMS |
| **Database Backups** | Supabase Cloud S3/GCS Cold Store | **AES-256** (Server-Side Encryption SSE-S3 / SSE-KMS) | Cloud Provider KMS |

---

## 3. Application-Level Token Cryptography Implementation

All OAuth tokens received from Meta are encrypted prior to database insertion using Node's cryptographic primitive:
* **Algorithm:** `AES-256-GCM` (Advanced Encryption Standard in Galois/Counter Mode).
* **Initialization Vector (IV):** Cryptographically secure 96-bit random IV per operation (`crypto.randomBytes(12)`).
* **Authentication Tag:** 128-bit authentication tag validating ciphertext integrity and authenticity (`cipher.getAuthTag()`).
* **Format:** `enc_gcm_v2_{iv_hex}_{tag_hex}_{ciphertext_hex}`.
* **Code Reference:** `packages/integrations/src/core/crypto.ts` & `apps/ralion/src/lib/services/metaCredential.service.ts`.

---

## 4. Provider & Infrastructure Verification Evidence

* **PostgreSQL Engine:** Supabase Cloud instances run on underlying cloud storage volumes formatted with full disk encryption (AES-256).
* **Key Lifecycle:** Master keys are managed in Cloud Key Management Services (KMS) with automated annual rotation.
* **Backup Protection:** Daily automated snapshots and WAL archives are encrypted with AES-256 prior to transfer to persistent object storage.
