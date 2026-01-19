# Deployment Guide (Git Version)

Since you are using Git, follow these steps to deploy to Hostinger.

## 1. Prepare your Repository
I have added a `package.json` to the **root** of your project. This fixes the "Unsupported framework" error.

1. **Commit and Push** these changes to your Git repository:
   ```bash
   git add .
   git commit -m "Add root package.json for deployment"
   git push
   ```

## 2. Configure Hostinger
1. Go to **Hostinger hPanel**.
2. Go to **Websites** -> **Manage**.
3. Search for **Git**.
4. **Add Repository**:
   - Repository: Your Git URL.
   - Branch: `main` (or `master`).
   - Install dependencies: **Yes**.
5. Once added, click **Deploy**.

## 3. Setup Node.js App (Important!)
After the Git files are pulled, you need to configure the Node.js runner:

1. Search for **Node.js App** in hPanel.
2. **Settings**:
   - **Application Root**: Leave as is (usually empty or `/`).
   - **Application Startup File**: `backend/server.js`.
   - **Package.json Location**: `package.json`.
3. Click **Save** / **Create**.

## 4. Build the Frontend (One-time Step)
Hostinger usually only runs `npm install` for the backend. We need to build the React frontend.

1. In the **Node.js App** dashboard, you might see a button for **NPM Install**. Click it first.
2. There isn't always a "Build" button. You have two options:

   **Option A: Run Build Command (Recommended)**
   - Click **Enter Game Console** (or SSH into your server).
   - Run this command:
     ```bash
     npm run build
     ```
   - This will install frontend dependencies and creating the `build` folder.

   **Option B: Commit the Build Folder (Easier)**
   - If Option A fails, you can build locally and push the build folder.
   - 1. Open `.gitignore` in your project.
   - 2. Find `/build` and remove it (or put a `#` in front of it).
   - 3. Run `cd frontend && npm run build`.
   - 4. Git commit the `frontend/build` folder and push.
   - 5. Redeploy on Hostinger.

## 5. Environment Variables
Don't forget to create your `.env` file in the root of your Hostinger file manager (setup specific keys like SMTP).

```env
PORT=8000
SMTP_HOST=smtp.titan.email
SMTP_USER=...
```
