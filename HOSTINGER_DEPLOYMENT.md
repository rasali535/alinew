# 🚀 Deploy Rasali Labs to Hostinger VPS with Docker

## What You'll Have After This

```
rasalilabs.com       → Marketing website (Vite + nginx)
rasalilabs.com/ralion → Ralion Dashboard (Next.js server mode)
rasalilabs.com/api   → Chatbot Backend (Express)
```

SSL auto-renews every 90 days. Pushes to `main` auto-deploy in ~5 minutes.

---

## Prerequisites

- **Domain**: rasalilabs.com (DNS pointing to VPS IP)
- **Hostinger VPS**: Ubuntu 20.04+ or Debian 11+
- **GitHub Repo**: Public or private (with deploy key configured)
- **.env file**: All secrets filled in (see Step 3)

---

## Step 1 — Prepare Your Hostinger VPS

### 1a. SSH into Your VPS

Log into [hPanel](https://hpanel.hostinger.com) → **VPS** → find your server → copy IP.

```bash
ssh root@YOUR_VPS_IP
```

### 1b. Update System & Install Dependencies

```bash
# Update package lists and upgrade installed packages
apt-get update && apt-get upgrade -y

# Install Docker (latest)
curl -fsSL https://get.docker.com | bash

# Install Docker Compose v2 (plugin)
apt-get install -y docker-compose-plugin

# Install Git
apt-get install -y git

# Install certbot (for initial SSL certificate)
apt-get install -y certbot

# Verify installations
docker --version
docker compose version
git --version
certbot --version
```

---

## Step 2 — Clone Your Repository on VPS

```bash
# Create web directory (standard practice)
mkdir -p /var/www && cd /var/www

# Clone your repo
git clone https://github.com/YOUR_USERNAME/alinew.git rasalilabs
cd /var/www/rasalilabs

# Verify structure
ls -la
```

Expected output includes:
```
docker-compose.yml
Dockerfile.website
Dockerfile.ralion
Dockerfile.backend
nginx/
apps/
packages/
.env.production.example
```

---

## Step 3 — Create & Secure `.env` on VPS

### 3a. Copy Template

```bash
cp .env.production.example .env
```

### 3b. Edit with Real Values

```bash
nano .env
```

Replace all placeholders:

| Variable | Where to Find |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → Service role key |
| `DATABASE_URL` | Supabase → Database → Connection string |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud Console |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `OAUTH_ENCRYPTION_KEY` | Generate: `openssl rand -hex 16` |
| OAuth IDs/Secrets | Your social app credentials |

> **Security**: Never commit `.env` to git. It's in `.gitignore`.

### 3c. Restrict Permissions

```bash
# Make .env readable only by root
chmod 600 .env
```

---

## Step 4 — Get Your First SSL Certificate

Before starting the containers, obtain an SSL certificate using the standalone method:

```bash
# Get certificate (replace your@email.com with your actual email)
certbot certonly --standalone \
  -d rasalilabs.com \
  -d www.rasalilabs.com \
  --agree-tos \
  --non-interactive \
  --email your@email.com
```

Output should show:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/rasalilabs.com/fullchain.pem
```

> **Automate renewal**: The `certbot` service in `docker-compose.yml` will auto-renew every 12 hours. No manual action needed after this point.

---

## Step 5 — Build & Start All Containers

```bash
# From /var/www/rasalilabs:
cd /var/www/rasalilabs

# Build images and start containers in background
docker compose up -d --build

# Watch the logs (Ctrl+C to stop watching; containers keep running)
docker compose logs -f
```

**Expected build time**: 3–5 minutes (Node dependencies + Next.js build).

When you see this pattern, it's ready:
```
rasali-website  | nginx: configuration test successful
rasali-nginx    | listening on 0.0.0.0:80 and 0.0.0.0:443
rasali-ralion   | ▲ Next.js 14.x.x ready
rasali-backend  | Server running on port 4000
rasali-certbot  | (running in background)
```

### 5b. Verify All Containers Are Running

```bash
docker compose ps
```

Expected output:
```
CONTAINER ID   IMAGE                 STATUS        PORTS
abc123...      nginx:1.25-alpine     Up 2 min      0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
def456...      rasali-website        Up 1 min      (internal)
ghi789...      rasali-ralion         Up 1 min      3000/tcp
jkl012...      rasali-backend        Up 1 min      4000/tcp
mno345...      certbot/certbot       Up 1 min      (background)
```

---

## Step 6 — Test Your Deployment Locally

From your **local machine** (not SSH'd into VPS):

```bash
# Test main site
curl -I https://rasalilabs.com

# Test Ralion dashboard
curl -I https://rasalilabs.com/ralion

# Test backend API
curl -I https://rasalilabs.com/api/health
```

All should return `HTTP/2 200` or `HTTP/1.1 200`.

---

## Step 7 — Configure GitHub Actions for Auto-Deploy

Every push to `main` triggers an automatic rebuild and deployment.

### 7a. Generate SSH Keys (on your **local machine**)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/rasali_deploy -N ""
```

This creates:
- `~/.ssh/rasali_deploy` — private key (→ GitHub secret)
- `~/.ssh/rasali_deploy.pub` — public key (→ VPS)

### 7b. Add Public Key to VPS

On the **VPS** (in SSH session):

```bash
# Display and copy the public key content
cat ~/.ssh/rasali_deploy.pub
```

Then on **VPS**:

```bash
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJm4x... github-actions-deploy
EOF

# Verify
cat ~/.ssh/authorized_keys
```

### 7c. Add GitHub Secrets

Go to GitHub → Your Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 4 secrets:

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP (e.g., `185.123.456.789`) |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Contents of `~/.ssh/rasali_deploy` (private key) |
| `VPS_PORT` | `22` |

### 7d. Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Hostinger VPS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            cd /var/www/rasalilabs
            git fetch origin
            git checkout main
            git pull origin main
            docker compose up -d --build --remove-orphans
            docker compose logs -f &
            sleep 30
            docker compose ps
```

---

## Day-to-Day Operations

### Monitor Containers

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs

# View all statuses
docker compose ps

# View real-time logs
docker compose logs -f

# View logs from specific container
docker compose logs -f ralion
docker compose logs -f backend
docker compose logs -f nginx
```

### Manual Redeploy (after code changes)

```bash
# If GitHub Actions auto-deploy didn't trigger:
cd /var/www/rasalilabs
git pull origin main
docker compose up -d --build --remove-orphans
```

### Restart a Single Service (without rebuild)

```bash
docker compose restart ralion
docker compose restart backend
docker compose restart nginx
```

### Stop Everything

```bash
docker compose down
```

### Free Disk Space

```bash
# Remove unused images/containers
docker image prune -f
docker system prune -f
```

---

## Hostinger VPS Firewall Settings

In **hPanel** → **VPS** → **Firewall**, open these ports:

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH access |
| 80 | TCP | HTTP (auto-redirects to HTTPS) |
| 443 | TCP | HTTPS (main traffic) |

---

## Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker compose logs website
docker compose logs ralion
docker compose logs backend
docker compose logs nginx

# Common issues:
# - .env missing or invalid values → check Step 3
# - Port 80/443 in use → change in docker-compose.yml
# - Out of memory → reduce replica counts or increase VPS RAM
```

### SSL Certificate Not Loading

```bash
# Check if cert exists
ls /etc/letsencrypt/live/rasalilabs.com/

# If missing, re-run Step 4:
certbot certonly --standalone \
  -d rasalilabs.com \
  -d www.rasalilabs.com \
  --agree-tos \
  --non-interactive \
  --email your@email.com

# Then restart nginx
docker compose restart nginx
```

### DNS Not Resolving

Ensure your domain's **A record** points to your VPS IP in your registrar settings (e.g., Hostinger, GoDaddy, Route53).

```bash
# Verify from VPS
nslookup rasalilabs.com
```

Should show your VPS IP.

### 404 on /ralion or /api

```bash
# Check that containers are healthy
docker compose ps

# Check nginx routing
docker compose logs nginx | grep -i "ralion\|api"

# Verify container ports
docker inspect rasali-ralion | grep -A 5 "Ports"
docker inspect rasali-backend | grep -A 5 "Ports"
```

### Out of Disk Space

```bash
# Check usage
df -h

# Clean up
docker system prune -a
docker volume prune

# If still full, check which containers take most space:
docker system df
```

---

## Security Best Practices

1. **SSH**: Disable password login; use keys only
2. **.env**: Never commit; ensure `chmod 600`
3. **Backups**: Regularly back up your VPS volumes
4. **Updates**: Run `apt update && apt upgrade` monthly
5. **Firewall**: Only open ports 22, 80, 443
6. **Docker Hub**: Don't store secrets in images; use runtime env vars only

---

## What's Next?

- **Monitor**: Set up uptime monitoring (UptimeRobot, Pingdom)
- **Backups**: Schedule daily backups of your Supabase DB
- **Logging**: Consider log aggregation (ELK Stack, LogRocket)
- **CI/CD**: Add tests to your GitHub Actions workflow before deploy
- **Scaling**: If traffic grows, upgrade to Swarm or Kubernetes

---

## Support

- **Docker Issues**: https://docs.docker.com
- **Hostinger Support**: https://www.hostinger.com/support
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **Next.js**: https://nextjs.org/docs
