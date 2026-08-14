#!/bin/bash
# =================================================================
# VPS Initial Setup Script — Run once on your Hostinger VPS
# Run as root: bash /var/www/rasalilabs/scripts/vps-setup.sh
# =================================================================

set -e  # Exit on error

echo "🚀 Rasali Labs VPS Setup — Starting..."

# Step 1: Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Step 2: Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com | bash

# Step 3: Install Docker Compose v2
echo "🐳 Installing Docker Compose v2..."
apt-get install -y docker-compose-plugin

# Step 4: Install Git
echo "📝 Installing Git..."
apt-get install -y git

# Step 5: Install Certbot
echo "🔒 Installing Certbot..."
apt-get install -y certbot

# Step 6: Verify installations
echo "✅ Verifying installations..."
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker compose version)"
echo "Git: $(git --version)"
echo "Certbot: $(certbot --version)"

# Step 7: Create web directory
echo "📁 Creating /var/www directory..."
mkdir -p /var/www
chmod 755 /var/www

echo ""
echo "✅ VPS Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repo: git clone https://github.com/YOUR_USERNAME/alinew.git /var/www/rasalilabs"
echo "2. Configure .env: cp .env.production.example .env && nano .env"
echo "3. Get SSL cert: certbot certonly --standalone -d rasalilabs.com -d www.rasalilabs.com"
echo "4. Start containers: cd /var/www/rasalilabs && docker compose up -d --build"
echo ""
