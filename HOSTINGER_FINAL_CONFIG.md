# Hostinger Deployment Guide - Final Configuration

## Current Project Structure
Your project is now a **single-root Express.js application** that serves a built React frontend.

```
alinew-1/
├── server.js          # Express server (serves API + static files)
├── package.json       # All dependencies (React + Express)
├── src/               # React source code
├── public/            # React public assets
├── build/             # Generated after running `npm run build`
└── ...config files
```

## Hostinger Configuration (CRITICAL - Follow Exactly)

### Step 1: In Hostinger hPanel, go to your Node.js application settings

### Step 2: Configure EXACTLY as follows:

**Framework Preset:** 
- Select **"None"** or **"Custom"** if available
- If you must choose, select **"Express.js"**
- DO NOT select "Create React App" or "React"

**Node Version:**
- **22.x** (or 20.x if 22.x is not available)

**Root Directory:**
- Leave **COMPLETELY EMPTY** (no `/`, no `./`, just blank)

**Build Command:**
```
npm run build
```

**Output Directory:**
```
build
```

**Start Command:**
```
npm start
```

**Package Manager:**
- **npm**

### Step 3: Environment Variables
Add these in Hostinger's Environment Variables section:
```
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_USER=your-email@themaplin.com
SMTP_PASSWORD=your-password
PORT=8000
```

### Step 4: Save and Deploy

## Why This Configuration Works

1. **`npm run build`** runs `craco build` which:
   - Compiles your React app
   - Outputs to `./build` folder
   - Creates production-ready static files

2. **`npm start`** runs `node server.js` which:
   - Starts Express server on port 8000 (or PORT env var)
   - Serves static files from `./build`
   - Provides API endpoints (`/api/booking`, `/api/contact`)
   - Handles React Router with catch-all route

## Troubleshooting

If you still get "Unsupported framework" error:

### Option A: Try uploading as ZIP
1. Download your repo as ZIP
2. Extract it locally
3. Delete `node_modules` folder
4. Delete `.git` folder
5. Re-zip the contents (not the folder itself)
6. Upload to Hostinger

### Option B: Check GitHub connection
1. Ensure the GitHub repo is public (or Hostinger has access)
2. Try disconnecting and reconnecting the repo
3. Make sure you're pointing to the `main` branch

### Option C: Manual deployment via hPanel
1. Use Hostinger's File Manager
2. Upload all files except `node_modules`
3. Use hPanel's terminal to run:
   ```bash
   npm install
   npm run build
   npm start
   ```

## What We Fixed

✅ Removed nested `frontend` folder  
✅ Removed conflicting `backend` folder  
✅ Fixed nested `public/public` structure  
✅ Cleaned up unnecessary build scripts  
✅ Unified all dependencies in root `package.json`  
✅ Set correct entry point (`server.js`)  
✅ Removed confusing files (`app.js`, `build.js`, etc.)

## Final Check

Your `package.json` should have:
- `"main": "server.js"`
- `"start": "node server.js"`
- `"build": "craco build"`
- Both React and Express dependencies

Your root folder should have:
- `server.js` (Express server)
- `package.json` (all deps)
- `src/` (React source)
- `public/` (React public)
- Config files (craco, tailwind, etc.)

## Contact
If this still doesn't work, the issue is likely with Hostinger's framework detection algorithm. Consider:
1. Contacting Hostinger support with this exact configuration
2. Using a different deployment method (Vercel, Netlify, Railway, Render)
3. Deploying frontend and backend separately
