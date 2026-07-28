# Production Integration & Deployment Routing Guide — Ras Ali Labs + Ralion

This document provides production integration, reverse proxy, binary download audit, and deployment routing instructions for **rasalilabs.com** and **Ralion**.

---

## 1. Large Binary Delivery & Download Audit (Task 8 & Task 4)

### Problem Diagnosed:
Users downloading `ralion-desktop-2.4.0-setup.exe` on Windows 11 x64 encountered the error:
> **"This app can't run on your PC"**

### Root Cause:
1. **Single-Page Application (SPA) Rewrite Interception**: Static hosts (Vercel, Netlify, Apache, Nginx) configured with SPA fallbacks (`/* -> /index.html`) served `index.html` (~1.9kB text) with HTTP 200 whenever the static binary file path was missing or intercepted. Windows saved `index.html` as `.exe` and failed to parse HTML text as a 64-bit PE executable binary.
2. **Static Host Asset Size Limits**: Hosts like Vercel & Netlify enforce strict **100MB per static file limits**. Uploading ~152MB installer binaries directly into static git deployments results in truncated or rejected uploads.

### Resolution & Architecture:
1. **High-Speed CDN Binary Delivery**: Deliver large installers (~152MB) via dedicated CDN storage (e.g. GitHub Releases CDN or Supabase Storage Bucket) using versioned filenames (`ralion-desktop-2.4.1-setup.exe`).
2. **SPA Rewrite Exclusion Rules**: Exclude binary extensions (`.exe`, `.dmg`, `.AppImage`, `.deb`) from `index.html` rewrites.
3. **Binary Response Headers**: Enforce:
   - `Content-Type: application/octet-stream`
   - `Content-Disposition: attachment; filename="ralion-desktop-2.4.1-setup.exe"`
   - `Cache-Control: public, max-age=31536000, immutable`

---

## 2. Server Header & Exclude Rules

### Apache / Hostinger (`public/.htaccess`)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Exclude installer binaries from SPA fallback rewrites
  RewriteCond %{REQUEST_URI} \.(exe|dmg|AppImage|deb|zip)$ [NC]
  RewriteRule ^ - [L]

  # Standard SPA Rewrite Rules
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(exe|dmg|AppImage|deb|zip)$">
    Header set Content-Type "application/octet-stream"
    Header set Content-Disposition "attachment"
    Header set Cache-Control "public, max-age=31536000, immutable"
    SetEnv no-gzip 1
  </FilesMatch>
</IfModule>
```

### Netlify / Cloudflare Pages (`public/_redirects`)
```text
/ralion-releases.json                 /ralion-releases.json                 200!
/downloads/*.exe                      /downloads/:splat.exe                 200!
/downloads/*.dmg                      /downloads/:splat.dmg                 200!
/downloads/*.AppImage                 /downloads/:splat.AppImage            200!
/*                                    /index.html                           200
```

---

## 3. Route Schema Summary

```text
rasalilabs.com
├── /                           (Website Home)
├── /products                   (Ecosystem Product Catalog)
│     └── /products/ralion      (Ralion Product Landing Page & Industry Solutions)
├── /downloads                  (Versioned Ralion Desktop 2.4.1 Downloads)
│     └── /downloads/releases   (Public Release Management Page)
├── /admin/releases            (Admin Release Management Portal)
├── /ralion/*                   (Ralion Operating System Application Entry)
├── /onboarding                (Customer Onboarding)
├── /account                    (SSO Account & Licenses)
├── /demo                       (Interactive Demo Sandbox)
├── /docs                       (Documentation Portal)
├── /support                    (Customer Support & Ticket Portal)
├── /pricing                    (SaaS Pricing Plans)
├── /changelog                  (Release Notes)
└── /beta                       (Beta Program)
```

---

## 4. Security & Validation Checklist

- [x] **PE Binary Header Validation**: Windows 11 x64 executable header validated (`application/octet-stream`).
- [x] **SHA-256 Checksum Verification**: Checksums published in `public/ralion-releases.json` with 1-click copy support.
- [x] **Download Event Analytics**: Logged to Supabase `download_events` table (`id`, `product`, `version`, `platform`, `created_at`).
- [x] **Admin Control Portal**: Auth-protected `/admin/releases` interface for managing version releases.
