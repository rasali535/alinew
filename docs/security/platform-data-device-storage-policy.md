# RALION — Meta Platform Data Endpoint & Device Storage Restriction Policy

**Policy Reference:** SEC-POL-006  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Standard:** Meta Platform Data Protection Assessment (Requirement: Endpoint / Device Storage Restrictions)  
**Effective Date:** August 2026  

---

## 1. Objective & Policy Statement

In accordance with **Meta Platform Terms** and the **Meta Data Protection Assessment**, **Meta Platform Data must NOT be stored on employee, contractor, or developer personal devices, unencrypted laptops, USB flash drives, local spreadsheets, screenshots, or local test environments**.

All approved Meta Platform Data processing and storage must strictly remain within authorized production backend systems (Supabase Cloud PostgreSQL database and secure server-side memory buffers).

---

## 2. Prohibited Actions

1. **No Local Database Dumps with Live Meta Data:**
   * Developers may not download production database backups containing Meta User IDs, email addresses, or access tokens to personal laptops or unmanaged workstations.
2. **No Cleartext Export:**
   * Meta user tokens, identifiers, or profile data must never be exported to CSV, Excel, Google Sheets, or unencrypted local files.
3. **No Local File Persistence:**
   * Client-side applications must never persist Meta access tokens in browser `localStorage`, `sessionStorage`, or indexedDB.
4. **No External Storage Devices:**
   * USB sticks, external hard drives, or personal cloud storage (Dropbox, personal Google Drive) may not be used to store or transfer Platform Data.

---

## 3. Approved Storage Locations

Meta Platform Data is authorized to reside solely in:
* **Primary Database:** Supabase Cloud PostgreSQL (`meta_connections` table, protected by AES-256 disk encryption and AES-256-GCM token encryption).
* **Volatile Memory:** Server-side Node.js memory during active Meta Graph API requests (transient buffers immediately garbage-collected after response processing).

---

## 4. Enforcement & Annual Attestation

All engineering personnel and system administrators must sign an annual attestation acknowledging compliance with this policy. Violations will result in immediate credential revocation and disciplinary action.
