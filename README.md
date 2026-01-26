# Ras Ali - Personal Portfolio

Multi-disciplinary creative & technologist based in Gaborone, Botswana. Specializing in premium web design, development, and digital experiences.

## 🚀 Deployment (Hostinger)

This site is built with **React + Vite** and uses a **PHP backend** for email handling to ensure 100% compatibility with Hostinger's static hosting.

### Manual Update Procedure

1. Run `npm run build` on your computer.
2. Open **Hostinger File Manager**.
3. Empty the `public_html` folder.
4. Upload everything from your local `dist/` folder into `public_html`.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS, Radix UI, Lucide React
- **Backend**: PHP (for `send_mail.php`)
- **Animation**: Framer Motion / CSS Transitions

## 📂 Project Structure

- `/src`: React components, pages, and logic.
- `/public`: Static assets and the `send_mail.php` handler.
- `vite.config.js`: Build configuration.
- `.htaccess`: Configures Hostinger to handle React Router (friendly URLs).
