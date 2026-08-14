# 🎯 Rasali Labs Deployment — Complete Overview

This document ties together all deployment documentation and serves as a navigation guide.

---

## 📚 Documentation Files

| File | Purpose | Read When |
|---|---|---|
| **DEPLOYMENT_QUICK_START.md** | 5-minute TL;DR for deployment | First time deploying |
| **HOSTINGER_DEPLOYMENT.md** | Full step-by-step guide (7 steps) | Need detailed instructions |
| **PRE_DEPLOYMENT_CHECKLIST.md** | Verification before going live | Before first production deploy |
| **ARCHITECTURE.md** | How containers talk to each other | Understanding system design |
| **VPS_COMMANDS_CHEATSHEET.md** | Common commands for daily use | Day-to-day operations |
| **POST_DEPLOYMENT_OPERATIONS.md** | Monitoring, troubleshooting, maintenance | After deployment, ongoing ops |
| **scripts/vps-setup.sh** | Automated VPS preparation (one-time) | Setting up bare VPS |
| **scripts/setup-ssh-keys.sh** | SSH key generation for GitHub Actions | Configuring auto-deploy |
| **.github/workflows/deploy-hostinger.yml** | GitHub Actions auto-deploy workflow | Auto-deployment on git push |

---

## 🚀 Quick Start (3 Steps)

### Step 1: Prepare VPS
```bash
ssh root@YOUR_VPS_IP
curl -fsSL https://get.docker.com | bash  # Install Docker
apt-get install -y docker-compose-plugin git certbot
```

### Step 2: Deploy App
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/alinew.git rasalilabs
cd rasalilabs

# Configure secrets
cp .env.production.example .env
nano .env  # Fill in all values

# Get SSL cert
certbot certonly --standalone \
  -d rasalilabs.com -d www.rasalilabs.com \
  --agree-tos --non-interactive \
  --email your@email.com

# Start containers
docker compose up -d --build
```

### Step 3: Auto-Deploy Setup
```bash
# Local machine: Generate SSH keys
bash scripts/setup-ssh-keys.sh

# VPS: Add public key
cat >> ~/.ssh/authorized_keys << 'EOF'
<contents of ~/.ssh/rasali_deploy.pub>
EOF

# GitHub: Add 4 secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_PORT)
# Done! Next git push auto-deploys.
```

---

## 📋 The System

### What Gets Deployed

```
rasalilabs.com           → Vite marketing website (static)
rasalilabs.com/ralion    → Next.js dashboard (server-side rendered)
rasalilabs.com/api       → Express API (chatbot backend)
```

All served over HTTPS with auto-renewing SSL from Let's Encrypt.

### Architecture

```
┌─ Hostinger VPS ────────────────────┐
│                                    │
│  ┌──────────────────────────────┐  │
│  │  nginx:443/80 (reverse proxy)│  │
│  │  rasali-nginx                │  │
│  └──────────────────────────────┘  │
│     ├→ /        → rasali-website    │
│     ├→ /ralion/ → rasali-ralion     │
│     └→ /api/    → rasali-backend    │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  rasali-certbot              │  │
│  │  (auto SSL renewal)          │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
       ↓ (external)
   Supabase (DB)
   Google Cloud (Vertex AI)
   OAuth Providers (Facebook, LinkedIn, etc.)
```

### How It Works

1. **Push to main** → GitHub Actions triggers
2. **SSH into VPS** → `git pull && docker compose up -d --build`
3. **Containers rebuild** → New images created from code
4. **Auto-restart** → nginx routes traffic to new containers
5. **SSL auto-renews** → certbot checks every 12 hours
6. **Done** → Update live in ~5 minutes

---

## 🛠️ Common Workflows

### I Just Pushed Code to Main

```bash
# Automatic via GitHub Actions (no action needed!)
# Check progress: GitHub Repo → Actions tab
# Check VPS: ssh root@YOUR_VPS_IP && docker compose ps
```

### I Want to Deploy Manually

```bash
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs
git pull origin main
docker compose up -d --build --remove-orphans
```

### I Need to Check Logs

```bash
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs
docker compose logs -f

# Or specific service:
docker compose logs -f ralion
docker compose logs -f backend
```

### I Need to Restart a Container

```bash
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs

# Quick restart (no rebuild)
docker compose restart ralion

# Or with rebuild
docker compose up -d --build ralion
```

### I Want to Update Environment Variables

```bash
ssh root@YOUR_VPS_IP
nano /var/www/rasalilabs/.env

# After editing:
docker compose restart ralion  # (or whichever service needs it)
```

### I Broke Something and Need to Rollback

```bash
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs

# View recent commits
git log --oneline -10

# Go back to previous commit
git checkout <commit-hash>

# Rebuild
docker compose up -d --build

# Later, go forward again:
git checkout main
```

---

## 🔒 Security Checklist

- ✅ `.env` file: `chmod 600` (readable only by root)
- ✅ `.env` file: Never committed to git (in .gitignore)
- ✅ SSH key: Added to `~/.ssh/authorized_keys` on VPS
- ✅ GitHub secrets: 4 secrets configured (VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_PORT)
- ✅ Firewall: Ports 22, 80, 443 open; others blocked
- ✅ Database: Secrets never logged; only runtime env vars
- ✅ SSL: Auto-renewed by certbot every 12 hours
- ✅ Backups: `.env` backed up; Supabase DB backed up regularly

---

## 📊 Monitoring

### Check Health (Daily)

```bash
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs

# All containers running?
docker compose ps

# Any errors?
docker compose logs | grep -i error

# Disk space OK?
df -h
```

### Check Performance (Weekly)

```bash
# Memory usage
docker stats

# Disk usage
docker system df

# Recent errors
docker compose logs --tail=100 | grep -i error
```

### Monitor Uptime

Set up external monitoring:
- **UptimeRobot** (free) — alerts if site goes down
- **Sentry** (free tier) — error tracking
- **Google Analytics** (free) — traffic metrics

---

## 🆘 Troubleshooting Quick Guide

| Problem | Diagnosis | Solution |
|---|---|---|
| Site returns 502 | `docker compose logs nginx` | Check if app containers are running: `docker compose ps` |
| /ralion returns 502 | `docker compose logs ralion` | Ralion build failed; check logs for Node.js errors |
| /api returns 502 | `docker compose logs backend` | Backend didn't connect to DB; check DATABASE_URL in .env |
| SSL certificate error | `ls /etc/letsencrypt/live/rasalilabs.com/` | Cert missing; re-run certbot (Step 4 in HOSTINGER_DEPLOYMENT.md) |
| Out of disk space | `df -h` | Run `docker system prune -a -f` |
| Containers won't start | `docker compose up -d --build` logs | Check .env values; ensure no syntax errors |
| GitHub Actions fails | GitHub Repo → Actions tab → View run | Check SSH key and GitHub secrets are correct |

**For more help**: See **POST_DEPLOYMENT_OPERATIONS.md** → Logs & Debugging section.

---

## 📞 Support Resources

- **Docker Documentation**: https://docs.docker.com
- **Docker Compose**: https://docs.docker.com/compose/
- **nginx**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Hostinger Support**: https://www.hostinger.com/support
- **GitHub Actions**: https://docs.github.com/en/actions

---

## 📈 Next Steps After Deployment

### Week 1
- [ ] Verify all routes work (/, /ralion, /api/health)
- [ ] Test OAuth logins (Facebook, LinkedIn, etc.)
- [ ] Check SSL certificate (no warnings in browser)
- [ ] Monitor error logs daily

### Week 2
- [ ] Set up UptimeRobot monitoring
- [ ] Back up .env file (store safely)
- [ ] Test manual deploy process
- [ ] Document any issues encountered

### Month 1
- [ ] Set up Sentry for error tracking
- [ ] Enable Google Analytics
- [ ] Review VPS resource usage (CPU, memory, disk)
- [ ] Plan scaling if needed

### Ongoing
- [ ] Monitor `docker compose logs` weekly
- [ ] Update dependencies monthly
- [ ] Backup Supabase DB regularly
- [ ] Review GitHub Actions deploy logs
- [ ] Keep security patches current

---

## 💡 Pro Tips

1. **Save the commands cheatsheet**: `VPS_COMMANDS_CHEATSHEET.md`
2. **Bookmark the deployment guide**: `HOSTINGER_DEPLOYMENT.md`
3. **Set alerts**: GitHub Stars this repo or set GitHub Notifications
4. **Test locally first**: `docker compose up` on your machine before pushing
5. **Keep `.env` backed up**: It's your recovery key if something goes wrong
6. **Use meaningful commit messages**: Makes rollbacks and debugging easier
7. **Monitor regularly**: Catch issues before users report them
8. **Have a runbook**: Keep this guide accessible to your team

---

## 🎓 Learning Resources

### To Understand Docker
- Start: https://www.docker.com/101-tutorial
- Compose: https://docs.docker.com/compose/gettingstarted/

### To Understand nginx
- Proxy: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- SSL: https://nginx.org/en/docs/http/ngx_http_ssl_module.html

### To Understand Let's Encrypt
- Overview: https://letsencrypt.org/how-it-works/
- Certbot: https://certbot.eff.org/

### To Understand the Apps
- Vite: https://vitejs.dev/guide/
- Next.js: https://nextjs.org/learn
- Express: https://expressjs.com/

---

## ✅ Final Checklist Before Launch

- [ ] All `.env` values filled in (no placeholders)
- [ ] SSL certificate obtained and verified
- [ ] Domain DNS pointing to VPS IP
- [ ] Firewall ports open (22, 80, 443)
- [ ] GitHub Actions secrets configured
- [ ] Tested at least one deploy (manual)
- [ ] Verified all routes work (/, /ralion, /api)
- [ ] Backed up `.env` file
- [ ] Backed up Supabase database
- [ ] Set up monitoring (optional but recommended)
- [ ] Team has access to deployment docs

---

## 🚀 You're Ready!

Everything is documented. You have:

1. **Quick start guide** — DEPLOYMENT_QUICK_START.md
2. **Step-by-step instructions** — HOSTINGER_DEPLOYMENT.md
3. **Pre-deployment checklist** — PRE_DEPLOYMENT_CHECKLIST.md
4. **System architecture docs** — ARCHITECTURE.md
5. **Daily operations guide** — VPS_COMMANDS_CHEATSHEET.md
6. **Post-deployment guide** — POST_DEPLOYMENT_OPERATIONS.md
7. **Automated setup scripts** — scripts/vps-setup.sh, setup-ssh-keys.sh
8. **GitHub Actions auto-deploy** — .github/workflows/deploy-hostinger.yml

**Next step**: Read DEPLOYMENT_QUICK_START.md and start deploying.

Good luck! 🎉

---

**Questions?** Check the relevant guide above. Everything is documented.
