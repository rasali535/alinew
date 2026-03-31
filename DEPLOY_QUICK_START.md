# 🎯 Quick Deployment Guide

## Option 1: GitHub Actions (Automated) ⚡ RECOMMENDED

### First-Time Setup (5 minutes)

1. Get FTP credentials from Hostinger
2. Add 3 secrets to GitHub repository Settings → Secrets:
   - `FTP_SERVER` (e.g., `ftp.themaplin.com`)
   - `FTP_USERNAME` (e.g., `u123456789`)
   - `FTP_PASSWORD` (your FTP password)

### Deploy Anytime

```bash
git add .
git commit -m "Your changes"
git push origin main
```

✅ **Done!** GitHub automatically builds and deploys to Hostinger.

---

## Option 2: Manual Upload (Traditional)

### Build Locally

```bash
npm run build
```

### Upload to Hostinger

1. Open Hostinger File Manager
2. Go to `public_html`
3. Delete old files
4. Upload everything from `build/` folder

---

## 🔍 Verify Deployment

Visit: <https://www.rasalibassist.themaplin.com/>

**Check Console (F12):**

```
Computed API_URL: https://alinew.onrender.com
```

**Test Ziggy:**

- Should auto-open in 3 seconds
- Fill name/email
- Send test message
- Should respond without 502 errors

---

## 📚 Full Documentation

- **GitHub Actions Setup**: See `GITHUB_DEPLOYMENT.md`
- **Manual Deployment**: See `DEPLOY_TO_HOSTINGER.md`
- **Backend Status**: <https://alinew.onrender.com/health>

---

**Current Status:**

- ✅ Backend: v1.0.3 (LIVE on Render)
- ✅ Frontend: Built and ready
- ✅ GitHub Actions: Configured (needs FTP secrets)
