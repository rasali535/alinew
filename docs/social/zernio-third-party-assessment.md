# Ralion OS — Zernio Third-Party Vendor Security & Compliance Assessment

**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Auditor:** Ras Ali Labs (Pty) Ltd Security & Compliance Office  
**Target Vendor:** Zernio (formerly Late / getlate.dev)  

---

## 1. Executive Summary

As part of Ras Ali Labs' Vendor Risk Management Framework and Meta Platform Data Compliance policies, this assessment evaluates the security controls, regulatory compliance posture, and data protection practices of Zernio as a third-party social infrastructure subprocessor.

---

## 2. Verified Compliance & Security Controls

| Category | Finding / Status | Evidence / Verification Method |
| :--- | :--- | :--- |
| **SOC 2 Certification** | **Verified:** SOC 2 Type II Compliant | Independent audit report verified via Zernio Trust Portal (`trust.zernio.com`) |
| **GDPR & Privacy Compliance** | **Verified:** GDPR Compliant / DPA Available | Standard Data Processing Addendum (DPA) supported with EU model clauses |
| **Encryption at Rest** | **Verified:** AES-256 | Platform OAuth tokens and profile metadata encrypted at rest in dedicated HSM/vault |
| **Encryption in Transit** | **Verified:** TLS 1.3 / HTTPS | All REST API and webhook endpoints enforce TLS 1.2+ minimum, modern cipher suites |
| **API Authentication** | **Verified:** Bearer API Key | Master API key authentication per organization with key rotation capabilities |
| **Webhook Security** | **Verified:** HMAC-SHA256 Signatures | Inbound payloads signed with `X-Zernio-Signature` header |
| **Multi-Tenancy Model** | **Verified:** Profile Container Hierarchy | Profiles provide logical tenant isolation for connected accounts |

---

## 3. Unverified / Vendor-Managed Items

* **Subprocessor Redundancy:** Specific cloud infrastructure providers (AWS / GCP / Cloudflare) are managed internally by Zernio; Ralion enforces server-side timeout failovers.
* **On-Premises Dedicated Instances:** Zernio operates primarily as a multi-tenant cloud SaaS infrastructure. Dedicated VPC peering is not currently required for Ralion's usage.

---

## 4. Vendor Risk Mitigation in Ralion

1. **Zero Secret Leakage:** Ralion never shares its master Supabase or customer database credentials with Zernio.
2. **Minimal Data Retention:** Ralion passes only content required for publishing. Customer CRM or PII is never routed to Zernio.
3. **Emergency Disconnect:** Ralion administrators can revoke Zernio access instantly and fail over to native platform connections.
