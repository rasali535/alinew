# RALION — Meta Platform Data Protection Assessment Evidence Collection Guide

**Entity:** Ras Ali Labs (Pty) Ltd  
**Target:** Meta Data Protection Assessment  
**Date:** August 2026  

---

## 1. Overview

This folder contains the evidence collection requirements, instructions, and audit artifacts required for submission to the **Meta Data Protection Assessment**.

---

## 2. Required Evidence Checklist & Source Locations

| # | Control Area | Evidence Item Required | How to Collect / Generate | Screenshot / Export Needed |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Backend Storage** | Supabase PostgreSQL Table Schema | Run Supabase SQL query on `meta_connections` or view table editor | Screenshot of Supabase Table Editor |
| **2** | **Encryption at Rest** | Written technical explanation + Cryptography Code | Refer to `/docs/security/encryption-at-rest.md` & `packages/integrations/src/core/crypto.ts` | PDF export of documentation + Code snippet |
| **3** | **TLS / HTTPS** | SSL Labs Report / OpenSSL output | Run `openssl s_client -connect rasalilabs.com:443 -tls1_2` | Screenshot of SSL Labs A+ scan |
| **4** | **Multi-Factor Auth (MFA)** | Admin MFA Configuration | Screenshot of Supabase Auth Settings showing MFA enabled, plus GitHub/Meta organization 2FA | Screenshot of 2FA enabled settings |
| **5** | **Vulnerability Testing** | Security Audit Scan Report | Run `npm run security:audit` | Console output log export |
| **6** | **Admin Audit Logs** | Elevated privilege audit log query | Query `security_audit_logs` where `event_category = 'ADMIN'` in Security Center | Screenshot of Security Center Audit Log tab |
| **7** | **Application Event Logs** | Sample Meta event records | Query `security_audit_logs` where `event_category = 'META'` showing Meta User ID & Timestamp | Screenshot of Meta events table in Security Center |
| **8** | **Log Retention** | Retention Policy Document | Refer to `/docs/security/log-retention-policy.md` | PDF export of Policy Document |
| **9** | **Weekly Security Review** | Completed 7-day review record | View `security_review_records` in Admin Security Center | Screenshot of completed Weekly Review record |
| **10**| **Data Deletion Callback** | Meta Developer Console configuration | Facebook Login → Settings → Data Deletion Request URL: `https://rasalilabs.com/ralion/api/meta/data-deletion` | Screenshot of Meta App Dashboard |
