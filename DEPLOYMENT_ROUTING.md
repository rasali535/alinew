# Ras Ali Labs Ecosystem Deployment & Routing Guide

This document outlines deployment routing for **rasalilabs.com**, ensuring that `/products`, `/products/ralion`, and `/ralion` are served seamlessly under the unified single domain (`rasalilabs.com`) without subdomains.

---

## Ecosystem Architecture Summary

- **Primary Domain**: `https://rasalilabs.com`
- **Product Catalog Route**: `https://rasalilabs.com/products`
- **Ralion Product Landing Page**: `https://rasalilabs.com/products/ralion`
- **Ralion Platform Application Entry**: `https://rasalilabs.com/ralion`
- **Authentication**: Single Sign-On (SSO) powered by Supabase (`https://yidsfihagwttlmhfynmf.supabase.co`)

---

## Deployment Web Server Configurations

### 1. Hostinger / Apache (`.htaccess`)
Included automatically in `public/.htaccess`:

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

### 2. Nginx Server Configuration

```nginx
server {
    listen 80;
    server_name rasalilabs.com www.rasalilabs.com;
    root /var/www/rasalilabs/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /ralion {
        try_files $uri $uri/ /index.html;
    }

    location /products {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. Netlify / Cloudflare Pages
Included automatically in `public/_redirects`:

```text
/*    /index.html   200
```

### 4. Render / Vercel `vercel.json` / `render.yaml`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Verification Commands

To verify compilation and static bundle generation:

```bash
npm run build
```

All route paths will resolve to `dist/index.html` allowing React Router DOM to client-side handle `/products/ralion` and `/ralion` with zero page reloads.
