# 🚀 GitHub Actions Deployment Setup

## Overview

This project now uses **GitHub Actions** to automatically deploy to Hostinger whenever you push to the `main` branch.

## 🔐 Setup Instructions

### 1. Get Your Hostinger FTP Credentials

1. Log in to [Hostinger Control Panel](https://hpanel.hostinger.com/)
2. Go to **Files** → **FTP Accounts**
3. Note down (or create) your FTP credentials:
   - **FTP Server**: Usually `ftp.yourdomain.com` or similar
   - **Username**: Your FTP username
   - **Password**: Your FTP password

### 2. Add Secrets to GitHub Repository

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/alinew-1`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these three secrets:

   | Name | Value | Example |
   |------|-------|---------|
   | `FTP_SERVER` | Your FTP server address | `ftp.themaplin.com` |
   | `FTP_USERNAME` | Your FTP username | `u123456789` |
   | `FTP_PASSWORD` | Your FTP password | `YourSecurePassword123!` |

### 3. Push to Deploy

Once secrets are configured, deployment is automatic:

```bash
# Make changes to your code
git add .
git commit -m "Update chatbot styling"
git push origin main
```

The workflow will:

1. ✅ Install dependencies
2. ✅ Build the frontend with production API URL
3. ✅ Deploy to Hostinger via FTP
4. ✅ Clean old files automatically

### 4. Monitor Deployment

- Go to **Actions** tab in your GitHub repository
- Click on the latest workflow run
- Watch the deployment progress in real-time
- Check for any errors in the logs

## 🎯 Workflow Features

- **Automatic Deployment**: Triggers on every push to `main`
- **Manual Trigger**: Can also run manually from Actions tab
- **Clean Deployment**: Removes old files before uploading new ones
- **Environment Variables**: Automatically sets `VITE_API_URL` during build
- **Fast**: Uses npm cache for faster builds

## 📊 Deployment Status

You can add a badge to your README to show deployment status:

```markdown
![Deploy to Hostinger](https://github.com/YOUR_USERNAME/alinew-1/actions/workflows/deploy-hostinger.yml/badge.svg)
```

## 🔧 Troubleshooting

### FTP Connection Failed

- Verify FTP credentials in GitHub Secrets
- Check if your Hostinger FTP is enabled
- Ensure FTP server address is correct (no `ftp://` prefix needed)

### Build Failed

- Check the Actions log for specific errors
- Verify all dependencies are in `package.json`
- Ensure `npm run build` works locally

### Files Not Updating

- Check if `dangerous-clean-slate: true` is enabled (it removes old files)
- Verify `server-dir` path is correct (`/public_html/`)
- Hard refresh your browser (Ctrl + Shift + R)

## 🚫 What NOT to Commit

The workflow uses GitHub Secrets for sensitive data. **Never commit**:

- ❌ FTP passwords
- ❌ API keys
- ❌ Database credentials

These should always be stored in GitHub Secrets or environment variables.

## 🔄 Alternative: Manual Deployment

If you prefer manual deployment, you can still use the old method:

1. Run `npm run build` locally
2. Upload `build/` folder contents to Hostinger File Manager
3. See `DEPLOY_TO_HOSTINGER.md` for detailed steps

---

**Ready to deploy?** Just push your changes to GitHub! 🚀
