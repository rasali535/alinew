# RALION — Social System Security & Compliance Controls

**Reference:** SEC-SOC-002  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Security Baseline

* **No Plaintext Tokens:** All tokens are encrypted using **AES-256-GCM** before database storage.
* **No Client Leaks:** The `social_credentials` table has strict RLS rejecting all client queries; only the server service role can access credentials.
* **No Token Logging:** All logging pipelines sanitize tokens and private headers.
* **TLS 1.2 / 1.3:** Enforced across all API communication.
* **CSRF State Nonces:** 15-minute expiring cryptographic state tokens for OAuth handshakes.
* **Least Privilege:** Multi-workspace tenant isolation based on `auth.uid()` and `workspace_members`.
