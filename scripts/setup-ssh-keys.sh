#!/bin/bash
# =================================================================
# Local Setup Script — Prepare SSH keys for GitHub Actions
# Run on your LOCAL MACHINE (not VPS)
# =================================================================

set -e

KEY_PATH="$HOME/.ssh/rasali_deploy"

echo "🔐 Generating SSH key for GitHub Actions deployment..."

# Generate SSH key
ssh-keygen -t ed25519 \
  -C "github-actions-deploy" \
  -f "$KEY_PATH" \
  -N ""

echo ""
echo "✅ SSH key generated at: $KEY_PATH"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣ Add to GitHub Secrets:"
echo "   Go to https://github.com/YOUR_USERNAME/alinew/settings/secrets/actions"
echo ""
echo "2️⃣ Add 4 new secrets:"
echo ""
echo "   Name: VPS_HOST"
echo "   Value: <your VPS IP address>"
echo ""
echo "   Name: VPS_USER"
echo "   Value: root"
echo ""
echo "   Name: VPS_SSH_KEY"
echo "   Value: (paste contents of $KEY_PATH below)"
echo ""
echo "   Name: VPS_PORT"
echo "   Value: 22"
echo ""
echo "3️⃣ Copy the PRIVATE key to GitHub:"
echo ""
cat "$KEY_PATH"
echo ""
echo "4️⃣ Copy the PUBLIC key to your VPS:"
echo ""
echo "   On your VPS, run:"
echo "   echo '$(cat $KEY_PATH.pub)' >> ~/.ssh/authorized_keys"
echo ""
echo "5️⃣ Test SSH connection:"
echo "   ssh -i $KEY_PATH root@<VPS_IP>"
echo ""
