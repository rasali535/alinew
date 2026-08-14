#!/bin/bash
# =================================================================
# Quick Deploy Cheatsheet — Common VPS commands
# Usage: Run these commands over SSH into your Hostinger VPS
# =================================================================

# 📊 STATUS & MONITORING
# ===================================

# View all running containers
docker compose ps

# View real-time logs
docker compose logs -f

# View logs from specific service
docker compose logs -f ralion
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f certbot

# View disk usage
df -h
docker system df


# 🔄 DEPLOY & RESTART
# ===================================

# Pull latest code and rebuild (manual deploy)
cd /var/www/rasalilabs && git pull origin main && docker compose up -d --build --remove-orphans

# Restart a single service (no rebuild)
docker compose restart ralion
docker compose restart backend
docker compose restart nginx

# Stop everything
docker compose down

# Stop and remove everything (warning: clears volumes!)
docker compose down -v


# 🔒 SSL CERTIFICATE
# ===================================

# Check if certificate exists
ls -la /etc/letsencrypt/live/rasalilabs.com/

# Manual certificate renewal (usually not needed)
certbot renew --force-renewal

# Check certificate expiration
certbot certificates


# 🧹 CLEANUP & MAINTENANCE
# ===================================

# Remove unused images and containers
docker image prune -f
docker container prune -f

# Deep clean (removes all unused Docker objects)
docker system prune -a -f

# View Docker disk usage in detail
docker system df -v


# 🐛 TROUBLESHOOTING
# ===================================

# Check all logs for errors
docker compose logs | grep -i error

# Inspect a container
docker inspect rasali-nginx

# SSH into a running container
docker exec -it rasali-backend /bin/sh

# Check if port 80/443 is listening
netstat -tlnp | grep -E ':80|:443'

# Check DNS resolution
nslookup rasalilabs.com

# Test HTTPS connection
curl -I https://rasalilabs.com


# 📦 BACKUP & RECOVERY
# ===================================

# Backup .env file (before it's too late!)
cp /var/www/rasalilabs/.env /var/www/rasalilabs/.env.backup

# Show running container IDs
docker ps -q

# Save all images to backup (WARNING: takes space)
docker save -o /tmp/rasali-images.tar rasali-website rasali-ralion rasali-backend
