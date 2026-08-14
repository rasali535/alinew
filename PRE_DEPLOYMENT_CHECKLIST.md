# Pre-Deployment Checklist

Use this to verify everything is ready **before** you push to production.

---

## ✅ Prerequisites (Complete These First)

- [ ] **Domain**: `rasalilabs.com` registered and DNS A-record points to VPS IP
- [ ] **Hostinger VPS**: Ubuntu/Debian instance provisioned and accessible via SSH
- [ ] **GitHub Repo**: Code pushed to `main` branch, repo is accessible
- [ ] **Email**: You have an email address for Let's Encrypt (for SSL renewal notices)

---

## ✅ Local Machine Preparation

- [ ] **Git SSH key**: Set up SSH access to GitHub (or use HTTPS with token)
- [ ] **OpenSSL installed**: Verify with `openssl version`
- [ ] **SSH client**: Can SSH into VPS with `ssh root@YOUR_VPS_IP`

---

## ✅ VPS Preparation (Before Deploying Apps)

On your VPS (SSH'd in as root):

```bash
# All of these should complete without errors
apt-get update && apt-get upgrade -y
curl -fsSL https://get.docker.com | bash
apt-get install -y docker-compose-plugin git certbot
```

Verify:
- [ ] `docker --version` shows Docker 20.10+
- [ ] `docker compose version` shows Docker Compose 2.0+
- [ ] `git --version` shows Git 2.0+
- [ ] `certbot --version` shows Certbot 1.0+

---

## ✅ Code & Configuration

In your **local** Git repo:

- [ ] **`.env.production.example`** exists and is committed
- [ ] **`docker-compose.yml`** exists and is valid YAML
- [ ] **`Dockerfile.website`, `Dockerfile.ralion`, `Dockerfile.backend`** exist
- [ ] **`nginx/nginx.conf`** exists and routes are correct
  - [ ] `/` → website
  - [ ] `/ralion/` → ralion
  - [ ] `/api/` → backend
- [ ] **`.dockerignore`** exists (speeds up builds)
- [ ] **`scripts/vps-setup.sh`** exists
- [ ] **`.github/workflows/deploy-hostinger.yml`** exists

---

## ✅ Environment Variables

### Supabase
- [ ] **`NEXT_PUBLIC_SUPABASE_URL`** — copied from Supabase project settings
- [ ] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** — copied from Supabase project settings
- [ ] **`SUPABASE_SERVICE_ROLE_KEY`** — copied from Supabase project settings
- [ ] **`DATABASE_URL`** — PostgreSQL connection string with SSL enabled
  - [ ] Format check: `postgresql://user:pass@host:port/dbname?sslmode=require`

### Platform URLs
- [ ] **`NEXT_PUBLIC_RASALI_PLATFORM_URL`** = `https://rasalilabs.com` (no trailing slash)
- [ ] **`NEXT_PUBLIC_APP_URL`** = `https://rasalilabs.com/ralion` (no trailing slash)
- [ ] **`VITE_API_URL`** = `https://rasalilabs.com/api` (no trailing slash)

### API & Services
- [ ] **`GOOGLE_CLOUD_PROJECT`** — Google Cloud project ID from console
- [ ] **`VERTEX_AI_LOCATION`** — typically `us-central1`
- [ ] **`GEMINI_MODEL`** — e.g., `gemini-1.5-pro` (verify API access)
- [ ] **`JWT_SECRET`** — 32+ random chars (generate: `openssl rand -base64 32`)
- [ ] **`OAUTH_ENCRYPTION_KEY`** — 32-byte hex string (generate: `openssl rand -hex 16`)

### OAuth Credentials (all required for features)
- [ ] **Facebook**: `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`
- [ ] **Instagram**: `INSTAGRAM_APP_ID` + `INSTAGRAM_APP_SECRET`
- [ ] **LinkedIn**: `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`
- [ ] **Twitter**: `TWITTER_CLIENT_ID` + `TWITTER_CLIENT_SECRET`
- [ ] **TikTok**: `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET`

### Optional
- [ ] **`CORS_ORIGINS`** = `https://rasalilabs.com`
- [ ] **`RUN_MIGRATIONS`** = `false` (migrations run on first deploy, then disable)
- [ ] **`DATABASE_SSL`** = `true`

---

## ✅ Build Verification (Local)

Run a test build locally to catch errors early:

```bash
# Build all images (without starting)
docker compose build

# Check for errors
docker compose ps --no-trunc  # Should show no errors
```

- [ ] `rasali-website` image builds without errors
- [ ] `rasali-ralion` image builds without errors
- [ ] `rasali-backend` image builds without errors

If any fail, fix the Dockerfile BEFORE deploying.

---

## ✅ SSL Certificate Setup

On your **VPS** (SSH'd in):

```bash
# Get initial certificate
certbot certonly --standalone \
  -d rasalilabs.com \
  -d www.rasalilabs.com \
  --agree-tos \
  --non-interactive \
  --email your@email.com
```

- [ ] Certificate created at `/etc/letsencrypt/live/rasalilabs.com/fullchain.pem`
- [ ] Private key created at `/etc/letsencrypt/live/rasalilabs.com/privkey.pem`

---

## ✅ GitHub Actions Setup

### 1. Generate SSH Keys (on **local** machine)

```bash
bash scripts/setup-ssh-keys.sh
```

- [ ] Created `~/.ssh/rasali_deploy` (private key)
- [ ] Created `~/.ssh/rasali_deploy.pub` (public key)

### 2. Add Public Key to VPS

```bash
# On VPS
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1... github-actions-deploy
EOF
```

- [ ] Public key added to VPS `~/.ssh/authorized_keys`

### 3. Add GitHub Secrets

Go to **GitHub Repo** → **Settings** → **Secrets and variables** → **Actions**

- [ ] **`VPS_HOST`** = Your VPS IP (e.g., `185.xxx.xxx.xxx`)
- [ ] **`VPS_USER`** = `root`
- [ ] **`VPS_SSH_KEY`** = Private key content from `~/.ssh/rasali_deploy`
- [ ] **`VPS_PORT`** = `22`

### 4. Verify SSH Key Works

```bash
# On local machine, test SSH to VPS with the deploy key
ssh -i ~/.ssh/rasali_deploy root@YOUR_VPS_IP "docker --version"
```

- [ ] Command succeeds without password prompt

---

## ✅ VPS Firewall

In **Hostinger hPanel** → **VPS** → **Firewall**:

- [ ] Port **22** (SSH) — TCP — **OPEN**
- [ ] Port **80** (HTTP) — TCP — **OPEN**
- [ ] Port **443** (HTTPS) — TCP — **OPEN**
- [ ] All other ports — **BLOCKED**

---

## ✅ DNS Configuration

At your domain registrar (Hostinger, GoDaddy, etc.):

- [ ] **A record**: `rasalilabs.com` → Your VPS IP
- [ ] **A record**: `www.rasalilabs.com` → Your VPS IP (or CNAME to rasalilabs.com)

Verify:
```bash
nslookup rasalilabs.com
# Should resolve to your VPS IP
```

---

## ✅ First Deployment (Manual)

Before using GitHub Actions, deploy once manually:

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Clone repo
cd /var/www
git clone https://github.com/YOUR_USERNAME/alinew.git rasalilabs
cd rasalilabs

# Copy and fill .env
cp .env.production.example .env
# Edit with: nano .env (or your favorite editor)

# Verify .env has ALL required variables
grep -c "=" .env  # Should show 20+ lines

# Secure .env
chmod 600 .env

# Start containers
docker compose up -d --build

# Wait 3-5 minutes for builds to complete
sleep 300

# Verify all containers are running
docker compose ps
```

All 5 containers should show `Up`:
- [ ] `rasali-nginx` — `Up`
- [ ] `rasali-website` — `Up`
- [ ] `rasali-ralion` — `Up`
- [ ] `rasali-backend` — `Up`
- [ ] `rasali-certbot` — `Up`

---

## ✅ Deployment Verification

After first deployment, verify all routes work:

```bash
# From your LOCAL machine
# Test main site
curl -I https://rasalilabs.com

# Test dashboard
curl -I https://rasalilabs.com/ralion

# Test API
curl -I https://rasalilabs.com/api/health

# Open in browser
# https://rasalilabs.com
# https://rasalilabs.com/ralion
# https://rasalilabs.com/api/health
```

Expected results:
- [ ] `https://rasalilabs.com` → HTTP 200 (HTML page loads)
- [ ] `https://rasalilabs.com/ralion` → HTTP 200 (Next.js page loads)
- [ ] `https://rasalilabs.com/api/health` → HTTP 200 (JSON response)
- [ ] All HTTPS (no certificate warnings)
- [ ] No console errors in browser DevTools

---

## ✅ GitHub Actions Trigger

To test auto-deploy:

```bash
# Make a small change to repo (e.g., update README)
echo "Deployed successfully" >> README.md
git add README.md
git commit -m "test deploy trigger"
git push origin main
```

- [ ] GitHub Actions workflow starts automatically
- [ ] Check **Actions** tab in GitHub to see build progress
- [ ] Workflow should complete in ~5 minutes
- [ ] Containers on VPS auto-restart with new code

Verify:
```bash
# SSH into VPS
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs
git log -1  # Should show your test commit
docker compose ps  # All containers still running
```

---

## ✅ Monitoring & Backups

### Monitoring (on VPS)

```bash
# Set up cron job for daily health checks
crontab -e

# Add this line (check health at 2 AM daily)
0 2 * * * /usr/bin/curl -s https://rasalilabs.com/api/health >> /var/log/health-check.log
```

- [ ] Created health check cron job (optional but recommended)

### Backups (Critical!)

```bash
# Back up .env file
cp /var/www/rasalilabs/.env /var/www/rasalilabs/.env.backup

# Consider:
# - Backing up Supabase database (in Supabase console)
# - Backing up /etc/letsencrypt (SSL certs)
# - Setting up automated VPS snapshots (Hostinger feature)
```

- [ ] Backed up `.env` file
- [ ] Backed up Supabase database
- [ ] Enabled VPS snapshots/backups (in Hostinger hPanel)

---

## ✅ Security Hardening (Optional but Recommended)

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Disable password login (keys only)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Set up fail2ban (DDoS protection)
apt-get install -y fail2ban
systemctl enable fail2ban

# Set up UFW firewall (simpler than Hostinger's GUI)
apt-get install -y ufw
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

- [ ] Disabled SSH password login (keys only)
- [ ] Installed fail2ban
- [ ] Firewall enabled

---

## ✅ Post-Deployment Monitoring

Create a monitoring dashboard (optional):

- [ ] Set up **UptimeRobot** (free) to monitor `https://rasalilabs.com`
- [ ] Set up **Sentry** (free tier) for error tracking in backend
- [ ] Set up **Vercel Analytics** or **Plausible** for frontend metrics
- [ ] Enable **CloudFlare** (free) for DDoS protection & caching (optional)

---

## ✅ Documentation

- [ ] You've read `HOSTINGER_DEPLOYMENT.md`
- [ ] You've read `DEPLOYMENT_QUICK_START.md`
- [ ] You've read `ARCHITECTURE.md`
- [ ] You've saved `VPS_COMMANDS_CHEATSHEET.md` for quick reference
- [ ] Team members have access to `DEPLOYMENT_QUICK_START.md`

---

## ✅ Final Sign-Off

Before going live, answer these questions:

- [ ] **Did you test builds locally?** Yes, all Dockerfiles build without errors.
- [ ] **Are all .env variables filled?** Yes, no placeholders remain.
- [ ] **Is SSL certificate active?** Yes, certbot has certs at `/etc/letsencrypt/`.
- [ ] **Can you SSH into VPS?** Yes, and deploy key is added.
- [ ] **Did you test at least one manual deploy?** Yes, all containers running.
- [ ] **Did you test GitHub Actions?** Yes, auto-deploy triggered and worked.
- [ ] **Did you back up important data?** Yes, .env and Supabase backed up.
- [ ] **Is DNS configured?** Yes, `rasalilabs.com` resolves to VPS IP.
- [ ] **Are firewall ports open?** Yes, 22, 80, 443 are open; others blocked.

---

## 🚀 Ready to Deploy!

If all boxes are checked, you're ready. First push to `main` triggers auto-deployment.

**Good luck!** 🎉

Questions? Check the troubleshooting section in `HOSTINGER_DEPLOYMENT.md`.
