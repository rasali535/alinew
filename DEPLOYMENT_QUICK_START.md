# 🚀 Rasali Labs Hostinger Deployment — Quick Start (TL;DR)

## 5-Minute Setup Overview

```bash
# Step 1: SSH into VPS
ssh root@YOUR_VPS_IP

# Step 2: Install Docker & co.
bash /tmp/vps-setup.sh  # Or run manually from HOSTINGER_DEPLOYMENT.md Step 1

# Step 3: Clone repo
git clone https://github.com/YOUR_USERNAME/alinew.git /var/www/rasalilabs

# Step 4: Setup secrets
cd /var/www/rasalilabs
cp .env.production.example .env
nano .env  # Fill in all values

# Step 5: Get SSL cert
certbot certonly --standalone \
  -d rasalilabs.com \
  -d www.rasalilabs.com \
  --agree-tos \
  --non-interactive \
  --email your@email.com

# Step 6: Start all containers
docker compose up -d --build

# Done! Check status
docker compose ps
```

---

## What Gets Deployed

| URL | Container | Port | What It Does |
|---|---|---|---|
| `https://rasalilabs.com` | `rasali-website` | 80→80 | Vite marketing site |
| `https://rasalilabs.com/ralion` | `rasali-ralion` | 3000 | Next.js dashboard |
| `https://rasalilabs.com/api` | `rasali-backend` | 4000 | Express chatbot API |
| Port 443 | `rasali-nginx` | 443 | Reverse proxy + SSL |

**All routing** happens in `nginx/nginx.conf` (reverse proxy).
**All SSL** managed by `certbot` container (auto-renews every 12 hours).

---

## Required Secrets in `.env`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# URLs
NEXT_PUBLIC_RASALI_PLATFORM_URL=https://rasalilabs.com
NEXT_PUBLIC_APP_URL=https://rasalilabs.com/ralion
VITE_API_URL=https://rasalilabs.com/api

# Database
DATABASE_URL=postgresql://...
DATABASE_SSL=true

# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT=gen-lang-...
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-1.5-pro

# OAuth
JWT_SECRET=<generate: openssl rand -base64 32>
OAUTH_ENCRYPTION_KEY=<generate: openssl rand -hex 16>

# Social credentials (optional but required for features)
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
# + Instagram, LinkedIn, Twitter, TikTok
```

---

## GitHub Actions Auto-Deploy

**Every push to `main` automatically:**
1. SSHs into VPS
2. `git pull origin main`
3. `docker compose up -d --build`

**Setup (one-time):**

```bash
# On your LOCAL machine:
bash scripts/setup-ssh-keys.sh

# Follow instructions to add 4 GitHub secrets:
# - VPS_HOST (your VPS IP)
# - VPS_USER (root)
# - VPS_SSH_KEY (private key content)
# - VPS_PORT (22)
```

Done. Next `git push` deploys automatically in ~5 min.

---

## Common VPS Commands

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs

# Check status
docker compose ps

# View logs (live)
docker compose logs -f

# View specific service logs
docker compose logs -f ralion
docker compose logs -f backend
docker compose logs -f nginx

# Manual deploy (if auto-deploy failed)
git pull origin main && docker compose up -d --build --remove-orphans

# Restart one service
docker compose restart backend

# Stop everything
docker compose down

# Clean up disk
docker system prune -a -f
```

---

## Troubleshooting Quick Fixes

| Problem | Fix |
|---|---|
| `Connection refused` on https://rasalilabs.com | Wait 2-3 min for build; check `docker compose logs nginx` |
| `502 Bad Gateway` on /ralion | Ralion container failed; check `docker compose logs ralion` |
| `404` on /api | Backend didn't start; check `docker compose logs backend` |
| Certificate missing | Re-run certbot in Step 5 above |
| Out of disk space | Run `docker system prune -a -f` |
| `.env` missing values | Run `nano .env` and fill in all values |

---

## What Each Container Does

### 🌐 `rasali-nginx` — Reverse Proxy + SSL
- Listens on ports 80 (HTTP) and 443 (HTTPS)
- Routes `/` → website, `/ralion/` → Next.js, `/api/` → backend
- Handles SSL certificates from certbot
- Sets security headers

### 🎨 `rasali-website` — Vite Marketing Site
- Serves pre-built static files from `apps/website/dist/`
- Runs inside nginx container
- SPA routing (React Router) fallback to index.html

### 📊 `rasali-ralion` — Next.js Dashboard
- Node.js server (standalone mode)
- Listens on port 3000 (internal, proxied by nginx)
- Server-side OAuth handling
- Auth via Supabase

### 🤖 `rasali-backend` — Express API
- Node.js/Express server
- Listens on port 4000 (internal, proxied by nginx)
- Connects to Supabase + Google Cloud Vertex AI
- Handles `/api/*` requests

### 🔒 `rasali-certbot` — SSL Certificate Manager
- Automatically renews Let's Encrypt certs every 12 hours
- Stores certs in volume `certbot-conf` (mounted by nginx)
- No manual action needed after initial setup

---

## Directory Structure on VPS

```
/var/www/rasalilabs/
├── docker-compose.yml       ← Main orchestration
├── Dockerfile.website       ← Vite build config
├── Dockerfile.ralion        ← Next.js build config
├── Dockerfile.backend       ← Express build config
├── .env                     ← Runtime secrets (created in Step 4)
├── nginx/
│   ├── nginx.conf           ← Main reverse proxy config
│   └── website.conf         ← Website nginx config
├── apps/
│   ├── website/             ← Vite marketing site
│   └── ralion/              ← Next.js dashboard
├── server/                  ← Express backend
├── packages/                ← Shared code
└── scripts/                 ← Deploy helpers
```

---

## Security Checklist

- ✅ `.env` permissions: `chmod 600 .env`
- ✅ SSH key: Added to `~/.ssh/authorized_keys` on VPS
- ✅ Firewall: Only ports 22, 80, 443 open
- ✅ Docker: Pull latest images on deploy (`docker compose up -d --build`)
- ✅ No secrets in Dockerfiles (use `--env-file` instead)
- ✅ SSL: Auto-renewed by certbot (no manual intervention)

---

## Need Help?

📖 Full guide: `HOSTINGER_DEPLOYMENT.md`
💻 VPS cheatsheet: `VPS_COMMANDS_CHEATSHEET.md`
🔧 SSH setup: `scripts/setup-ssh-keys.sh`
🐳 Docker Compose: https://docs.docker.com/compose/
🔒 Let's Encrypt: https://letsencrypt.org/
