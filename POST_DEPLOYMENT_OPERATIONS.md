# Post-Deployment Operations & Maintenance

This guide covers day-to-day operations, troubleshooting, and maintenance after deployment.

---

## Daily Monitoring

### Quick Status Check

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs

# Check all containers
docker compose ps

# Expected output:
# STATUS column should show "Up" for all containers
# HEALTH column should show "healthy" or empty (no "unhealthy")
```

### Check Logs

```bash
# View last 50 lines of all containers
docker compose logs --tail=50

# Follow logs in real-time (Ctrl+C to stop)
docker compose logs -f

# View logs from a specific container
docker compose logs -f nginx
docker compose logs -f ralion
docker compose logs -f backend
docker compose logs -f certbot

# Search logs for errors
docker compose logs | grep -i error
docker compose logs | grep -i "502\|503\|5xx"
```

### Monitor Resource Usage

```bash
# CPU, memory, network of all containers
docker stats

# Disk space
df -h
du -sh /var/www/rasalilabs

# Docker disk usage
docker system df
```

---

## Common Tasks

### Restart Everything (Fresh Start)

```bash
cd /var/www/rasalilabs

# Stop all containers
docker compose down

# Wait a moment
sleep 5

# Start everything again
docker compose up -d

# Watch it start
docker compose logs -f
```

### Restart a Specific Container

```bash
# Without rebuild (use existing image)
docker compose restart ralion

# With rebuild (pulls fresh from Dockerfile)
docker compose up -d --build ralion

# View its logs after restart
docker compose logs -f ralion
```

### Pull Latest Code & Rebuild

This is what GitHub Actions does automatically, but you can do it manually:

```bash
cd /var/www/rasalilabs

# Fetch latest code from GitHub
git fetch origin main

# Switch to main branch
git checkout main

# Pull changes
git pull origin main

# Rebuild and restart
docker compose up -d --build --remove-orphans

# Wait for builds
sleep 300

# Verify
docker compose ps
```

### Rebuild Without Pulling Code

If you edited files directly on VPS (not recommended):

```bash
cd /var/www/rasalilabs

# Rebuild images from local files
docker compose build --no-cache

# Restart with new images
docker compose up -d
```

### Rollback to Previous Deployment

If latest deployment is broken:

```bash
cd /var/www/rasalilabs

# View git history
git log --oneline -10

# Checkout previous commit
git checkout <commit-hash>

# Rebuild
docker compose up -d --build

# If you need to go back forward:
git checkout main
```

---

## SSL Certificate Management

### Check Certificate Expiration

```bash
# View cert details
certbot certificates

# Expected output shows expiration date (should be 90 days from now)
```

### Manual Certificate Renewal

Normally, the `certbot` container handles this automatically every 12 hours. If manual renewal needed:

```bash
# Force renewal
certbot renew --force-renewal

# Verify it worked
certbot certificates

# Restart nginx to load new cert
docker compose restart nginx
```

### Add Additional Domain

If you add a subdomain (e.g., `api.rasalilabs.com`):

```bash
# Get cert for new domain
certbot certonly --standalone \
  -d rasalilabs.com \
  -d www.rasalilabs.com \
  -d api.rasalilabs.com \
  --agree-tos \
  --non-interactive \
  --email your@email.com

# Update nginx.conf to route the new domain
nano nginx/nginx.conf

# Rebuild and restart nginx
docker compose up -d --build nginx
```

---

## Performance Optimization

### Enable Caching

Caching is already configured in `nginx/nginx.conf`, but you can adjust:

```bash
# View current cache settings
grep -A 2 "cache" nginx/nginx.conf

# To increase cache time for static files, edit:
nano nginx/nginx.conf

# Change: add_header Cache-Control "public, max-age=31536000, immutable";
# Rebuild nginx
docker compose up -d --build nginx
```

### Monitor Memory Usage

```bash
# If containers use too much memory:
docker stats

# Check individual container memory
docker inspect rasali-backend | grep -i "memory"

# If needed, increase VPS RAM in Hostinger hPanel and restart
docker compose down
docker compose up -d
```

### Clear Docker Cache

If disk space is low:

```bash
# Remove unused images
docker image prune -f

# Remove unused containers
docker container prune -f

# Remove all unused networks and volumes
docker system prune -f

# Deep clean (removes ALL dangling objects)
docker system prune -a -f
```

### Check Build Times

```bash
# Time the next build
time docker compose build --no-cache

# If slow, consider:
# - Splitting large Dockerfiles
# - Using layer caching (dependencies in separate layer)
# - Pre-pulling base images
```

---

## Database Management

### Check Database Connection

```bash
# From backend container
docker exec rasali-backend curl -s http://localhost:4000/health | jq

# Should show status: "ok" or similar
```

### Run Database Migrations

```bash
# Migrations typically run automatically on first deploy
# To run manually (if needed):

# Set RUN_MIGRATIONS=true in .env temporarily
nano .env

# Restart backend
docker compose restart backend

# Watch for migration output
docker compose logs -f backend

# When done, set RUN_MIGRATIONS=false in .env
nano .env
docker compose restart backend
```

### Backup Supabase Database

This should be done regularly:

```bash
# From local machine (or VPS)
# In Supabase console → Project Settings → Backups

# Or use pg_dump:
PGPASSWORD="your_password" pg_dump -h db-host -U postgres -d postgres > /tmp/db-backup.sql

# Keep backups safe:
scp root@YOUR_VPS_IP:/tmp/db-backup.sql ~/backups/db-$(date +%Y%m%d).sql
```

---

## Logs & Debugging

### Save Logs to File

```bash
# Save all container logs
docker compose logs > /tmp/all-logs.txt

# Save specific container logs
docker compose logs backend > /tmp/backend-logs.txt

# Download to local machine for analysis
scp root@YOUR_VPS_IP:/tmp/backend-logs.txt ~/
```

### Inspect a Running Container

```bash
# List files inside container
docker exec rasali-backend ls -la /app

# View container's environment variables
docker exec rasali-backend env

# Run a command inside container
docker exec rasali-backend node -v

# Start interactive shell in container
docker exec -it rasali-backend /bin/sh
```

### Network Debugging

```bash
# Check DNS resolution inside containers
docker exec rasali-backend nslookup website
docker exec rasali-backend nslookup backend

# Check network connectivity between containers
docker exec rasali-nginx ping website

# View container network config
docker inspect rasali-ralion | grep -A 10 "Networks"
```

### Test API Endpoints

```bash
# From VPS (internal test)
docker exec rasali-backend curl http://localhost:4000/health

# From external (public test)
curl https://rasalilabs.com/api/health

# POST to API with data
curl -X POST https://rasalilabs.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```

---

## Security Updates

### Update Base Images

```bash
# Pull latest versions of base images
docker compose pull

# Rebuild images using latest bases
docker compose build --pull --no-cache

# Restart with updated images
docker compose up -d
```

### Update Docker Daemon

```bash
# Check current version
docker --version

# Update Docker
apt-get update
apt-get install --only-upgrade docker.io

# Restart daemon
systemctl restart docker

# Verify
docker --version
```

### Scan Images for Vulnerabilities

```bash
# Use trivy (if installed)
trivy image rasali-backend

# Or use Docker Scout (Docker Desktop)
docker scout cves rasali-backend

# Fix vulnerabilities by updating base images in Dockerfiles
nano Dockerfile.backend  # Update node:20-alpine to latest patch
docker compose up -d --build
```

---

## Scaling & Optimization

### Monitor Peak Hours

```bash
# Check CPU/memory during high traffic
docker stats

# If consistently high, consider:
# - Upgrading VPS RAM/CPU in Hostinger
# - Caching more aggressively
# - Optimizing database queries
```

### Add More Replicas (Docker Swarm)

If single VPS isn't enough:

```bash
# Initialize Swarm (one-time)
docker swarm init

# Create service replicas
docker service create \
  --name rasali-backend \
  --replicas 3 \
  --publish 4000:4000 \
  rasali-backend:latest
```

But for most cases, vertical scaling (bigger VPS) is simpler.

---

## Disaster Recovery

### Complete VPS Failure

If VPS is lost, restore from backup:

```bash
# On new VPS instance:
1. SSH in and run VPS setup: bash scripts/vps-setup.sh
2. Clone repo: git clone ... /var/www/rasalilabs
3. Copy .env backup: cp .env.backup .env (you backed this up, right?)
4. Get SSL cert (or restore from backup)
5. docker compose up -d --build
```

### Container Crash Loop

If a container keeps restarting:

```bash
# Check logs
docker compose logs -f <container>

# Common causes:
# - .env variable missing → check and add it
# - Port already in use → change port in docker-compose.yml
# - Out of memory → increase VPS RAM
# - Build error → check Dockerfile for syntax

# Fix and rebuild
docker compose up -d --build <container>
```

### Database Corruption

If Supabase DB is corrupted:

```bash
# 1. Restore from Supabase backup in their console
# 2. Or restore from your pg_dump backup:
PGPASSWORD="pwd" psql -h db-host -U postgres -d postgres < backup.sql

# 3. Restart backend
docker compose restart backend
```

### SSL Certificate Lost

```bash
# Regenerate:
certbot certonly --standalone \
  -d rasalilabs.com \
  -d www.rasalilabs.com \
  --agree-tos \
  --non-interactive \
  --email your@email.com

# Restart nginx
docker compose restart nginx
```

---

## Scheduled Maintenance

### Weekly

- [ ] Check disk space: `df -h`
- [ ] Review error logs: `docker compose logs | grep -i error`
- [ ] Verify all containers running: `docker compose ps`

### Monthly

- [ ] Update OS packages: `apt-get update && apt-get upgrade -y`
- [ ] Update Docker: `apt-get install --only-upgrade docker.io`
- [ ] Scan images for vulnerabilities: `docker scout cves <image>`
- [ ] Test backups (restore and verify)

### Quarterly

- [ ] Full VPS security audit
- [ ] Update dependencies in code (npm, pip, etc.)
- [ ] Review and clean up old images: `docker image prune`
- [ ] Optimize database (Supabase → Maintenance)

### Annually

- [ ] Review costs and consider scaling
- [ ] Plan for major upgrades (Node version, database schema, etc.)
- [ ] Update deployment documentation
- [ ] Test disaster recovery plan

---

## Support & Escalation

### Check Official Docs

- Docker Compose: https://docs.docker.com/compose/
- Docker CLI: https://docs.docker.com/engine/reference/commandline/cli/
- Let's Encrypt: https://letsencrypt.org/
- nginx: https://nginx.org/

### Get Help

```bash
# Docker community forums
# https://forums.docker.com

# Stack Overflow
# Tag: docker, docker-compose, nginx

# Hostinger support
# https://www.hostinger.com/support
```

### Collect Diagnostic Info

When reporting issues, collect:

```bash
# OS info
uname -a

# Docker version
docker --version
docker compose version

# Container status
docker compose ps

# Recent logs (sanitize secrets first!)
docker compose logs --tail=100 > diagnostics.log

# Disk usage
df -h

# Memory
free -h
```

---

## Key Reminders

✅ **Back up .env regularly** — it's your recovery key
✅ **Monitor `docker compose logs`** — errors often appear there first
✅ **Keep SSL certs renewed** — certbot container handles this automatically
✅ **Test backups** — a backup that doesn't restore is worthless
✅ **Document changes** — keep a changelog of what was updated and when
✅ **Use git** — all code changes should be in git history for rollback capability
✅ **Security first** — keep base images updated, firewall tight, SSH keys secure

---

## Contacts & Resources

- **Your VPS**: https://hpanel.hostinger.com
- **GitHub Repo**: https://github.com/YOUR_USERNAME/alinew
- **Supabase**: https://app.supabase.com
- **Google Cloud**: https://console.cloud.google.com
- **Domain Registrar**: (wherever you registered rasalilabs.com)

---

Good luck with your deployment! 🚀
