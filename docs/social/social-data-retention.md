# RALION — Social Data Retention & Deletion Policy

**Reference:** RET-SOC-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Data Lifecycle Standards

1. **Active Connections:**
   Profile metadata (`account_name`, `username`, `avatar_url`) is refreshed every 24 hours.
2. **Disconnected Accounts:**
   When a user disconnects an account, all OAuth credentials in `social_credentials` are **immediately shredded** and revoked at the provider endpoint.
3. **Audit Records:**
   Connection and disconnect event history is preserved in `security_audit_logs` for **90 days** for compliance and security auditing without storing private credentials.
4. **User Data Deletion Callbacks:**
   Automated callback `/api/meta/data-deletion` deletes all Meta platform records upon user application removal.
