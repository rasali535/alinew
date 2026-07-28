# Production Integration & Deployment Routing Guide — Ras Ali Labs + Ralion

This document provides production integration, reverse proxy, and deployment routing instructions for **rasalilabs.com** and **Ralion**.

---

## 1. Production Architecture Overview

- **Primary Production Domain**: `https://rasalilabs.com`
- **Routing Paradigm**: Single unified domain without subdomains.
- **Shared Authentication**: Supabase Single Sign-On (SSO) with Row-Level Security (RLS) policies.
- **Shared Supabase Instance**: `https://yidsfihagwttlmhfynmf.supabase.co`

### Route Schema

```text
rasalilabs.com
├── /                           (Website Home)
├── /products                   (Ecosystem Product Catalog)
│     └── /products/ralion      (Ralion Product Landing Page & Industry Solutions)
├── /ralion/*                   (Ralion Operating System Application Entry & Modules)
│     ├── /ralion/login         (SSO Auth Entry)
│     ├── /ralion/dashboard     (Executive Command Dashboard)
│     ├── /ralion/crm           (CRM & Deals Pipeline)
│     ├── /ralion/mari-ai       (Mari AI Reasoning Studio)
│     └── /ralion/settings      (Ecosystem Settings)
├── /onboarding                (Customer Solution & Organization Onboarding)
├── /account                    (SSO User Profile & License Management)
├── /downloads                  (Download Center for Windows, macOS, Linux)
└── /developers                 (Developer Portal & API Docs)
```

---

## 2. Reverse Proxy Deployment Options

### Option A: Preferred — Nginx Reverse Proxy Architecture (Single Domain Proxy)

When deploying Ras Ali Labs Website and Ralion Web Application from separate build artifacts or repositories on a single server:

```nginx
server {
    listen 80;
    server_name rasalilabs.com www.rasalilabs.com;

    root /var/www/rasalilabs/website/dist;
    index index.html;

    # 1. Main Website & Product Pages
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Ralion Application Proxy (/ralion/*)
    location /ralion/ {
        # Option A1: Local proxy to Ralion web server build running on port 3000
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Option A2: Static fallback to SPA dist index.html
        try_files $uri $uri/ /index.html;
    }

    # 3. Static Assets & Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

### Option B: Hostinger / Apache (`.htaccess`) SPA Fallback

For shared hosting or Hostinger Apache servers, place in `public/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

### Option C: Vercel Rewrites (`vercel.json`)

```json
{
  "rewrites": [
    {
      "source": "/ralion/:path*",
      "destination": "/index.html"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. Shared Environment Variables Checklist

Ensure both website and Ralion platform deploy environments set:

```env
VITE_SUPABASE_URL=https://yidsfihagwttlmhfynmf.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_4QwqM-obElPsgghW6r06ag_yfuIibbt
VITE_PLATFORM_URL=https://rasalilabs.com
VITE_RALION_URL=https://rasalilabs.com/ralion

NEXT_PUBLIC_SUPABASE_URL=https://yidsfihagwttlmhfynmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4QwqM-obElPsgghW6r06ag_yfuIibbt
NEXT_PUBLIC_PLATFORM_URL=https://rasalilabs.com
NEXT_PUBLIC_RALION_URL=https://rasalilabs.com/ralion
```

---

## 4. Security & Compliance Checklist

- [x] **Authentication Protected Routes**: Access to `/ralion/dashboard`, `/ralion/crm`, `/ralion/mari-ai`, `/ralion/settings`, and `/account` verified via Supabase JWT SSO session.
- [x] **Supabase RLS Enabled**: Row-Level Security active on PostgreSQL tables (`users`, `organizations`, `licenses`).
- [x] **Organization Isolation**: Multi-tenant isolation enforced via `organization_id` policies.
- [x] **License & Subscription Checks**: Active solution licenses verified during customer onboarding (`/onboarding`).
- [x] **API & Key Protection**: Only publishable anon keys exposed client-side; service keys stored securely in server vaults.
