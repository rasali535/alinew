# Deployment Guide for Booking System

## Backend Deployment

### Prerequisites
- Node.js installed on your server
- Access to your hosting control panel or SSH

### Steps:

1. **Upload Backend Files**
   - Upload the entire `backend` folder to your server
   - Recommended location: `/home/yourusername/backend` or similar

2. **Install Dependencies**
   ```bash
   cd /path/to/backend
   npm install
   ```

3. **Create .env File on Server**
   Create a `.env` file in the backend directory with:
   ```
   SMTP_HOST=smtp.titan.email
   SMTP_PORT=465
   SMTP_USER=your-email@yourdomain.com
   SMTP_PASSWORD=your-password
   PORT=8000
   ```

4. **Start the Server (with PM2 for production)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name booking-api
   pm2 save
   pm2 startup
   ```

5. **Configure Web Server (Apache/Nginx)**
   
   **For Apache (.htaccess or virtual host):**
   ```apache
   ProxyPass /api http://localhost:8000/api
   ProxyPassReverse /api http://localhost:8000/api
   ```
   
   **For Nginx:**
   ```nginx
   location /api {
       proxy_pass http://localhost:8000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
   }
   ```

## Frontend Deployment

### Update Production Environment

1. **Edit `.env.production`**
   - If backend is on same domain: Leave as `/api/booking`
   - If backend is on different domain: Set full URL
   ```
   REACT_APP_API_URL=/api/booking
   ```

2. **Build for Production**
   ```bash
   cd frontend
   npm run build
   ```

3. **Upload Build Files**
   - Upload contents of `frontend/build` folder to your web root
   - Usually: `public_html` or `www` directory

## Testing Production

1. Visit your production URL: https://raslibassist.themaplin.com
2. Navigate to the booking page
3. Submit a test booking
4. Verify email is received

## Troubleshooting

### Backend Not Responding
- Check if Node.js process is running: `pm2 status`
- Check logs: `pm2 logs booking-api`
- Verify port 8000 is not blocked by firewall

### CORS Errors
- Ensure backend has CORS enabled (already configured in server.js)
- Check that proxy configuration is correct in web server

### Email Not Sending
- Verify SMTP credentials in `.env`
- Check backend logs for email errors
- Test SMTP connection manually

## Local Development

To run locally (as you just tested):

1. **Start Backend:**
   ```bash
   cd backend
   node server.js
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. Access at `http://localhost:3000`
