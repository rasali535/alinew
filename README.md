# Ras Ali Labs & Ralion OS Monorepo

Welcome to the central repository for **Ras Ali Labs**. This repository is a unified monorepo containing the main company website, marketing pages, and the complete **Ralion AI Business Operating System** (Web, Desktop, and Admin portals).

## 📂 Repository Architecture

This project is structured as an npm workspace containing several modular applications and shared packages:

### Applications (`/apps`)
- **`apps/website`**: The main public-facing company website and product marketing pages (React + Vite).
- **`apps/ralion`**: The Ralion OS web application (Next.js), statically exported and served under `/ralion`.
- **`apps/admin`**: Internal operations and administration dashboard (Next.js), including server-side API routes.
- **`apps/desktop`**: The Ralion OS Desktop Application (Electron), securely bundling the production renderer files.

### Packages (`/packages`)
- **`packages/ui`**: Shared UI components and design system.
- **`packages/core`**: Core business logic, types, and utility functions.
- **`packages/database`**: Supabase client initialization, schema definitions, and database migrations.
- **`packages/auth`**: Shared authentication logic and Context providers.
- **`packages/ai`**: Mari AI engine utilities and inference connectors.
- **`packages/modules`**: Shared feature modules (Billing, CRM, Vault, etc.).

## 🚀 Quick Start

### 1. Install Dependencies
Run the installation command from the root directory to bootstrap all workspaces:
```bash
npm install
```

### 2. Environment Variables
Ensure the root `.env` file is populated with the correct credentials (e.g., Supabase URLs, AI API Keys). Both Vite and Next.js applications pull from this central configuration file.

### 3. Development
You can run all development servers concurrently from the root:
```bash
npm run dev
```

Alternatively, run specific apps:
- `npm run web:dev` (Website)
- `npm run ralion:dev` (Ralion Web)

## 🛠️ Build & Deployment

To build the entire ecosystem for production, run:
```bash
npm run build
```

**How the build system works:**
1. The website builds its static assets into `apps/website/dist`.
2. The Ralion OS Next.js app builds and statically exports into `apps/ralion/out`.
3. A custom `merge-builds.js` script automatically copies the exported Ralion OS into `apps/website/dist/ralion`.
4. The final, merged output inside `apps/website/dist` (and `apps/website/build`) is ready for deployment to Hostinger.

### Desktop Application Builds
The Electron desktop application relies on the bundled production renderer files. After running `npm run build`, you can build the desktop app for Windows by running:
```bash
npm run desktop:dist:win
```

## ⚙️ Tech Stack
- **Frontend**: React 18, Vite, Next.js 14
- **Desktop**: Electron, Electron Builder
- **Styling**: Tailwind CSS, Radix UI, Lucide React
- **Backend/Auth**: Supabase
- **AI Integration**: Mari AI Engine (Custom RAG & Inference)
