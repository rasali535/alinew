# RALION — Social Token Security & Vault Architecture

**Reference:** SEC-SOC-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Zero-Exposure Storage Principle

1. **Isolation:**
   Access and refresh tokens are stored exclusively in the `social_credentials` table, which is protected by Supabase Row Level Security policies allowing access **strictly to the server-side service role**.
2. **Authenticated Encryption (AES-256-GCM):**
   * **Key Derivation:** SHA-256 hash of `OAUTH_ENCRYPTION_KEY`.
   * **IV:** 96-bit cryptographically random Initialization Vector per operation.
   * **Tag:** 128-bit authentication tag validating data authenticity.
   * **Ciphertext Format:** `enc_gcm_v2_{iv_hex}_{tag_hex}_{ciphertext_hex}`.
3. **In-Memory Decryption:**
   Tokens are decrypted only in server memory for the duration of an outbound API request and are never returned in public client API responses.
4. **Token Revocation & Data Shredding:**
   When a user clicks "Disconnect", `SocialTokenManager.revokeAndDestroy()` immediately calls the remote platform's revocation endpoint and purges the encrypted credentials from the database.
