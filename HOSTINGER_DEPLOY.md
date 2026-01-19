# Deploying to Hostinger

This guide explains how to deploy your "Alinew" web application to Hostinger.

Because you have a **Node.js Backend** and a **React Frontend**, the best way to deploy on Hostinger is using their "Setup Node.js App" feature (available on Shared/Cloud Hosting) or as a single unit if you are using a VPS.

**We have already prepared a self-contained build for you.**

## 1. The Prepared Build

We have built your React frontend and placed the files inside `backend/public`.
This means your `backend` folder now contains EVERYTHING needed to run the site (both API and Website).

**Folder Structure of `backend`:**
```
backend/
├── public/          <-- Contains your website (index.html, css, js) - DO NOT DELETE
├── node_modules/    <-- Dependencies (usually not uploaded, install on server)
├── server.js        <-- The entry point
├── package.json
└── .env             <-- You must create this on the server
```

## 2. Deployment Steps (Shared/Cloud Hosting)

### Step 1: Zip the Backend
1. Go to your `alinew` folder.
2. Select the `backend` folder.
3. Zip it (e.g., `backend.zip`).

### Step 2: Upload to Hostinger
1. Log in to your Hostinger hPanel.
2. Go to **File Manager**.
3. Upload `backend.zip` to your domain folder (e.g., `public_html`).
4. **Extract** the zip file.
   - Ensure the files (`server.js`, `package.json`, `public/`) are in `public_html` (or a subfolder if you prefer).
   - If they are inside a `backend` folder after extraction, move them **up** to the main directory.

### Step 3: Setup Node.js App (hPanel)
1. In hPanel, search for **Node.js App**.
2. Click **Create Application**.
3. **Settings:**
   - **Node.js Version:** 18 or 20 (Recommended).
   - **Application Mode:** Production.
   - **Application Root:** `public_html` (or wherever you extracted the files).
   - **Application Startup File:** `server.js`.
4. Click **Create**.

### Step 4: Install Dependencies
1. Once the app is created, you will see a button **Enter Game Console** or **NPM Install**.
2. Click **NPM Install**. This will read `package.json` and install the required libraries.

### Step 5: Configure Environment Variables
1. Hostinger might not let you edit `.env` easily via GUI, so create a file named `.env` in the **File Manager** inside your application root.
2. Add the following content (update with your real email password):

```env
PORT=8000
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_USER=hello@themaplin.com
SMTP_PASSWORD=your_actual_password_here
```

### Step 6: Restart
1. Go back to the **Node.js App** section in hPanel.
2. Click **Restart**.

## 3. Verify
Visit your website URL. You should see the React site.
- If you see "Index of /", ensure your `server.js` is running and the "Startup File" is strictly set to `server.js`.
- If you see a 404 or white screen, check the `public` folder exists on the server.

## Troubleshooting

- **Images missing?** Ensure the `public/assets` folder is correctly uploaded.
- **API Errors?** Check `backend_error.log` in the File Manager.
- **Email not working?** Verify your SMTP credentials in the `.env` file.
