# RALION — TLS & Encryption-in-Transit Architecture

**Policy Reference:** SEC-POL-002  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Standard:** Meta Platform Data Protection Assessment (Requirement: TLS 1.2+ for Public Network Transmission)  
**Effective Date:** August 2026  

---

## 1. Requirement & Executive Summary

The **Meta Platform Data Protection Assessment** mandates that all Meta Platform Data transmitted over public networks must be encrypted using **TLS 1.2 or higher**. Insecure legacy protocols (SSLv2, SSLv3, TLS 1.0, TLS 1.1, unencrypted HTTP, cleartext FTP) are strictly prohibited.

Ralion enforces **TLS 1.2 and TLS 1.3 exclusively** across all public web domains, APIs, Supabase cloud communication channels, and Meta Graph API endpoints.

---

## 2. Production Domain & Endpoint Landscape

| Domain / Endpoint | Protocol | Minimum TLS | HSTS Configuration | Certificate Authority |
| :--- | :--- | :--- | :--- | :--- |
| `https://rasalilabs.com` | HTTPS | **TLS 1.3 / 1.2** | `max-age=63072000; includeSubDomains; preload` | Let's Encrypt / Cloudflare SSL (Automated Renewal) |
| `https://rasalilabs.com/ralion` | HTTPS | **TLS 1.3 / 1.2** | `max-age=63072000; includeSubDomains; preload` | Let's Encrypt / Cloudflare SSL |
| `https://yidsfihagwttlmhfynmf.supabase.co` | HTTPS | **TLS 1.3 / 1.2** | Enforced by Supabase Cloud Infrastructure | Let's Encrypt / Cloudflare SSL |
| `https://graph.facebook.com` | HTTPS | **TLS 1.3 / 1.2** | Enforced by Meta Infrastructure | DigiCert Global Root CA |

---

## 3. Strict HTTPS Redirection & HSTS Enactment

1. **Automatic HTTP to HTTPS Upgrade:**
   * All incoming HTTP requests on port 80 are permanently redirected via `301 Moved Permanently` to port 443 HTTPS.
2. **HTTP Strict Transport Security (HSTS):**
   * Configured in Next.js security headers and edge proxy:
     ```http
     Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
     ```
   * Enforces 2-year client-side browser caching of HTTPS enforcement and qualifies for global browser HSTS preload list submission.
3. **Approved Cipher Suites (PFS - Perfect Forward Secrecy):**
   * `TLS_AES_256_GCM_SHA384` (TLS 1.3)
   * `TLS_CHACHA20_POLY1305_SHA256` (TLS 1.3)
   * `TLS_AES_128_GCM_SHA256` (TLS 1.3)
   * `ECDHE-ECDSA-AES256-GCM-SHA384` (TLS 1.2)
   * `ECDHE-RSA-AES256-GCM-SHA384` (TLS 1.2)
   * `ECDHE-ECDSA-AES128-GCM-SHA256` (TLS 1.2)
   * `ECDHE-RSA-AES128-GCM-SHA256` (TLS 1.2)

---

## 4. Verification & Testing Method

To verify TLS configuration on production endpoints:
```bash
# Verify TLS 1.2 / 1.3 handshake and certificate chain
curl -Iv https://rasalilabs.com/ralion
openssl s_client -connect rasalilabs.com:443 -tls1_2
openssl s_client -connect rasalilabs.com:443 -tls1_3
```
Qualys SSL Labs Target Grade: **A+**.
